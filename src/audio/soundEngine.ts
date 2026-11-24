import {
  evaluateAcoustics,
  type AcousticInputs,
  type AcousticOutputs,
} from './acoustics.js';

export type SoundOneShotType = 'light-off' | 'afterburner-stage' | 'canopy-latch';

export interface SoundOneShotEntry {
  readonly type: SoundOneShotType;
  readonly timeS: number;
}

export interface SoundDebugState {
  readonly hasAudioContext: boolean;
  readonly contextState: string;
  readonly muted: boolean;
  readonly continuousMuted: boolean;
  readonly graphNodesBuilt: number;
  readonly oneShotsFired: number;
  readonly oneShotLog: readonly SoundOneShotEntry[];
  readonly lastOutputs: AcousticOutputs | null;
}

function createNoiseBuffer(
  ctx: AudioContext,
  seconds: number,
  kind: 'brown' | 'pink' | 'crackle'
): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);

  // Deterministic LCG PRNG for reproducible synthesis
  let seed = kind === 'brown' ? 101 : kind === 'pink' ? 202 : 303;
  const nextRand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  if (kind === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * nextRand()) / 1.02;
      data[i] = Math.max(-1, Math.min(1, last * 3.5));
    }
  } else if (kind === 'pink') {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = nextRand();
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + w * 0.1848) * 0.14));
    }
  } else {
    // High-energy jet/afterburner crackle texture
    for (let i = 0; i < len; i++) {
      const w = nextRand();
      data[i] = Math.abs(w) > 0.88 ? w : w * 0.2;
    }
  }

  return buf;
}

/**
 * Procedural Web Audio engine for the F-22 Interactive Explorer.
 *
 * - Muted by default (requires explicit user gesture to unmute/initialize AudioContext)
 * - Distance attenuation & atmospheric low-pass absorption via evaluateAcoustics()
 * - Ready for Phase 4 twin-engine spool / afterburner synthesis
 */
export class ExplorerSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = true;
  private graphNodesBuilt = 0;
  private oneShotsFired = 0;
  private readonly oneShotLog: SoundOneShotEntry[] = [];
  private lastOutputs: AcousticOutputs | null = null;

  private masterGain: GainNode | null = null;
  private airLpf: BiquadFilterNode | null = null;
  private rumbleGain: GainNode | null = null;
  private roarGain: GainNode | null = null;
  private crackleGain: GainNode | null = null;
  private whineGain: GainNode | null = null;
  private whineOsc: OscillatorNode | null = null;
  private interiorGain: GainNode | null = null;
  private interiorOsc: OscillatorNode | null = null;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (!muted) {
      this.ensureGraph();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    }
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, now, 0.04);
    }
  }

  private ensureGraph(): void {
    if (this.ctx) return;
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.muted ? 0 : 0.85;
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    const airLpf = ctx.createBiquadFilter();
    airLpf.type = 'lowpass';
    airLpf.frequency.value = 12_000;
    airLpf.connect(masterGain);
    this.airLpf = airLpf;

    // 1. Low jet rumble bus (brown noise -> LPF 180 Hz)
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = createNoiseBuffer(ctx, 4.0, 'brown');
    rumbleSrc.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 180;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    rumbleSrc.connect(rumbleFilter).connect(rumbleGain).connect(airLpf);
    rumbleSrc.start();
    this.rumbleGain = rumbleGain;

    // 2. Jet exhaust roar bus (pink noise -> bandpass 460 Hz)
    const roarSrc = ctx.createBufferSource();
    roarSrc.buffer = createNoiseBuffer(ctx, 4.0, 'pink');
    roarSrc.loop = true;
    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = 'bandpass';
    roarFilter.frequency.value = 460;
    roarFilter.Q.value = 0.7;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0;
    roarSrc.connect(roarFilter).connect(roarGain).connect(airLpf);
    roarSrc.start();
    this.roarGain = roarGain;

    // 3. Afterburner crackle bus
    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = createNoiseBuffer(ctx, 3.0, 'crackle');
    crackleSrc.loop = true;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.value = 900;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;
    crackleSrc.connect(crackleFilter).connect(crackleGain).connect(airLpf);
    crackleSrc.start();
    this.crackleGain = crackleGain;

    // 4. Turbine spool whine bus (sine/triangle oscillator)
    const whineOsc = ctx.createOscillator();
    whineOsc.type = 'triangle';
    whineOsc.frequency.value = 420;
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0;
    whineOsc.connect(whineGain).connect(airLpf);
    whineOsc.start();
    this.whineOsc = whineOsc;
    this.whineGain = whineGain;

    // 5. Interior cockpit hum bus
    const interiorOsc = ctx.createOscillator();
    interiorOsc.type = 'sine';
    interiorOsc.frequency.value = 62;
    const interiorGain = ctx.createGain();
    interiorGain.gain.value = 0;
    interiorOsc.connect(interiorGain).connect(masterGain);
    interiorOsc.start();
    this.interiorOsc = interiorOsc;
    this.interiorGain = interiorGain;

    this.graphNodesBuilt = 15;
  }

  public update(inputs: AcousticInputs): AcousticOutputs {
    const out = evaluateAcoustics(inputs);
    this.lastOutputs = out;

    if (this.muted || !this.ctx || !this.airLpf) {
      return out;
    }

    const now = this.ctx.currentTime;
    const tau = 0.05;
    this.airLpf.frequency.setTargetAtTime(out.lpfCutoffHz, now, tau);
    this.rumbleGain!.gain.setTargetAtTime(out.rumbleGain * 0.55, now, tau);
    this.roarGain!.gain.setTargetAtTime(out.roarGain * 0.45, now, tau);
    this.crackleGain!.gain.setTargetAtTime(out.crackleGain * 0.35, now, tau);
    this.whineGain!.gain.setTargetAtTime(out.whineGain * 0.14, now, tau);
    this.whineOsc!.frequency.setTargetAtTime(320 + inputs.spoolFraction * 1600, now, tau);
    this.interiorGain!.gain.setTargetAtTime(out.interiorGain * 0.25, now, tau);
    this.interiorOsc!.frequency.setTargetAtTime(52 + inputs.spoolFraction * 36, now, tau);

    return out;
  }

  public triggerOneShot(type: SoundOneShotType, timeS: number): void {
    this.oneShotsFired++;
    this.oneShotLog.push({ type, timeS });
    if (this.oneShotLog.length > 64) {
      this.oneShotLog.shift();
    }
  }

  public getDebugState(): SoundDebugState {
    return {
      hasAudioContext: this.ctx !== null,
      contextState: this.ctx ? (this.ctx.state as string) : 'none',
      muted: this.muted,
      continuousMuted: this.lastOutputs?.continuousMuted ?? true,
      graphNodesBuilt: this.graphNodesBuilt,
      oneShotsFired: this.oneShotsFired,
      oneShotLog: this.oneShotLog,
      lastOutputs: this.lastOutputs,
    };
  }
}

export const soundEngine = new ExplorerSoundEngine();
