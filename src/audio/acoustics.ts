import { CONSTANTS_REGISTRY } from '../sim/config/registry.js';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AcousticInputs {
  /** Sound source position in hangar/world meters. */
  readonly sourcePosM: Vec3;
  /** Listener (active camera) position in hangar/world meters. */
  readonly listenerPosM: Vec3;
  /** True when camera is inside the cockpit (muffled canopy attenuation). */
  readonly isInterior: boolean;
  /** Whether the engine/audio simulation is actively running. */
  readonly running: boolean;
  /** Normalized core spool [0..1]. */
  readonly spoolFraction: number;
  /** Normalized afterburner intensity [0..1]. */
  readonly afterburnerFraction: number;
  /** Number of running engines (0, 1, or 2). */
  readonly activeEngineCount: number;
  /** Optional APU spool fraction [0..1] for autonomous start whine. */
  readonly apuSpoolFraction?: number;
}

export interface AcousticOutputs {
  /** Sea-level reference speed of sound (m/s) from registry. */
  readonly speedOfSoundMs: number;
  /** Acoustic propagation delay d / c (s). */
  readonly delayS: number;
  /** Straight-line source-to-listener distance (m). */
  readonly distanceM: number;
  /** Atmospheric absorption low-pass cutoff frequency (Hz). */
  readonly lpfCutoffHz: number;
  /** Continuous gains [0..1] for each persistent audio bus. */
  readonly rumbleGain: number;
  readonly roarGain: number;
  readonly whineGain: number;
  readonly crackleGain: number;
  readonly interiorGain: number;
  /** True when continuous engine audio is suppressed. */
  readonly continuousMuted: boolean;
}

/**
 * Pure physically-inspired acoustic attenuation & bus gain evaluator for the
 * F-22 hangar/ground-run explorer.
 *
 * - Distance attenuation (inverse-distance rolloff with near-field floor)
 * - High-frequency atmospheric absorption (distance-dependent LPF cutoff)
 * - Cockpit canopy attenuation when in interior seat-level view
 */
export function evaluateAcoustics(inp: AcousticInputs): AcousticOutputs {
  const dx = inp.listenerPosM.x - inp.sourcePosM.x;
  const dy = inp.listenerPosM.y - inp.sourcePosM.y;
  const dz = inp.listenerPosM.z - inp.sourcePosM.z;
  const distanceM = Math.hypot(dx, dy, dz);

  const speedOfSoundMs = CONSTANTS_REGISTRY.SEA_LEVEL_SPEED_OF_SOUND_MS.value;
  const delayS = inp.isInterior ? 0 : distanceM / speedOfSoundMs;

  const activeEngines = Math.max(0, inp.activeEngineCount);
  const spool = Math.max(0, Math.min(1, inp.spoolFraction));
  const ab = Math.max(0, Math.min(1, inp.afterburnerFraction));
  const apu = Math.max(0, Math.min(1, inp.apuSpoolFraction ?? 0));
  const hasEngineSound = activeEngines > 0 && spool > 0.001;
  const continuousMuted = !inp.running || (!hasEngineSound && apu <= 0.01);

  if (continuousMuted) {
    return {
      speedOfSoundMs,
      delayS,
      distanceM,
      lpfCutoffHz: inp.isInterior ? 320 : 12_000,
      rumbleGain: 0,
      roarGain: 0,
      whineGain: 0,
      crackleGain: 0,
      interiorGain: 0,
      continuousMuted: true,
    };
  }

  // Twin-engine acoustic power scaling (~+3 dB for 2 engines vs 1)
  const engineScale = hasEngineSound ? Math.min(1, Math.sqrt(activeEngines / 2)) : 0;

  // Inverse-distance rolloff with 8 m near-field reference radius
  const refDistM = 8;
  const distAtten = Math.min(1, refDistM / Math.max(refDistM, distanceM));

  // Atmospheric high-frequency absorption vs distance (or canopy muffling inside cockpit)
  const lpfCutoffHz = inp.isInterior
    ? 340
    : Math.max(650, Math.min(12_000, 12_000 * Math.exp(-distanceM / 180)));

  const extScale = inp.isInterior ? 0.12 : distAtten;
  const rumbleGain = Math.min(1, engineScale * (0.25 + 0.55 * spool + 0.2 * ab) * extScale);
  const roarGain = Math.min(1, engineScale * (0.15 + 0.65 * spool + 0.2 * ab) * extScale);
  const whineGain = Math.min(1, (engineScale * spool * 0.45 + apu * 0.35) * extScale);
  const crackleGain = Math.min(1, engineScale * ab * 0.85 * extScale);
  const interiorGain = inp.isInterior
    ? Math.min(1, (engineScale * (0.2 + 0.5 * spool + 0.3 * ab) + apu * 0.15))
    : 0;

  return {
    speedOfSoundMs,
    delayS,
    distanceM,
    lpfCutoffHz,
    rumbleGain,
    roarGain,
    whineGain,
    crackleGain,
    interiorGain,
    continuousMuted: false,
  };
}
