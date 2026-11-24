import { describe, expect, it } from 'vitest';
import { drawEngineMfdCanvas } from '../src/scene/CockpitDetail.js';
import { CONSTANTS_REGISTRY as R } from '../src/sim/config/registry.js';
import {
  abortOrShutdownEngines,
  createEnginePresetState,
  createInitialEngineSimState,
  ENGINE_START_STEPS,
  setEngineThrottle,
  startEngineSequence,
  stepEngineSim,
  type EngineStartPhase,
} from '../src/sim/engineSim.js';

function advance(state: ReturnType<typeof createInitialEngineSimState>, seconds: number, dt = 0.1) {
  let s = state;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    s = stepEngineSim(s, dt);
  }
  return s;
}

describe('F-22 Twin F119 Engine Start State Machine & Spool Model', () => {
  it('progresses through all ordered start-sequence phases from OFF to RUNNING', () => {
    let s = createInitialEngineSimState();
    expect(s.phase).toBe('OFF');
    expect(s.outdoors).toBe(false);

    s = startEngineSequence(s);
    const seenPhases: EngineStartPhase[] = [s.phase];
    expect(s.outdoors).toBe(true);

    for (let i = 0; i < 300; i++) {
      s = stepEngineSim(s, 0.1);
      if (seenPhases[seenPhases.length - 1] !== s.phase) {
        seenPhases.push(s.phase);
      }
      if (s.phase === 'RUNNING') break;
    }

    expect(seenPhases).toEqual(ENGINE_START_STEPS.map((st) => st.phase));
    expect(s.left.lit).toBe(true);
    expect(s.right.lit).toBe(true);
    expect(s.left.n2Pct).toBeGreaterThan(50);
    expect(s.right.n2Pct).toBeGreaterThan(45);
  });

  it('supports abort mid-start and clean shutdown back to OFF', () => {
    let s = startEngineSequence(createInitialEngineSimState());
    s = advance(s, 10.0); // mid-way through Engine 1 light-off
    expect(s.phase).not.toBe('OFF');
    expect(s.phase).not.toBe('RUNNING');

    s = abortOrShutdownEngines(s);
    expect(s.phase).toBe('SHUTDOWN');
    expect(s.left.lit).toBe(false);
    expect(s.right.lit).toBe(false);

    // Cooldown back to OFF
    s = advance(s, 25.0);
    expect(s.phase).toBe('OFF');
    expect(s.outdoors).toBe(false);
    expect(s.left.n2Pct).toBe(0);
    expect(s.right.n2Pct).toBe(0);
    expect(s.totalThrustLbf).toBe(0);
  });

  it('spool-up is monotonic, bounded, and thrust never exceeds the sourced 35,000-lbf class', () => {
    let s = startEngineSequence(createInitialEngineSimState());
    s = advance(s, 30.0);
    expect(s.phase).toBe('RUNNING');

    // Ramp to Mil power (0.75 throttle)
    s = setEngineThrottle(s, R.ENGINE_MIL_THROTTLE_THRESHOLD.value);
    let prevN2 = s.left.n2Pct;
    let prevThrust = s.left.thrustLbf;
    for (let i = 0; i < 80; i++) {
      s = stepEngineSim(s, 0.1);
      expect(s.left.n2Pct).toBeGreaterThanOrEqual(prevN2 - 1e-6);
      expect(s.left.thrustLbf).toBeGreaterThanOrEqual(prevThrust - 1e-3);
      expect(s.left.afterburnerOn).toBe(false);
      expect(s.left.thrustLbf).toBeLessThanOrEqual(R.F119_AB_THRUST_CLASS_LBF.value);
      prevN2 = s.left.n2Pct;
      prevThrust = s.left.thrustLbf;
    }
    expect(s.left.regime).toBe('MIL');
    expect(s.left.n2Pct).toBeGreaterThan(95);

    // Engage Full Afterburner (1.0 throttle)
    s = setEngineThrottle(s, 1.0);
    const milNozzle = s.left.nozzleOpenFraction;
    for (let i = 0; i < 60; i++) {
      s = stepEngineSim(s, 0.1);
      expect(s.left.thrustLbf).toBeLessThanOrEqual(R.F119_AB_THRUST_CLASS_LBF.value + 1e-6);
      expect(s.right.thrustLbf).toBeLessThanOrEqual(R.F119_AB_THRUST_CLASS_LBF.value + 1e-6);
      expect(s.totalThrustLbf).toBeLessThanOrEqual(R.F119_AB_THRUST_CLASS_LBF.value * 2 + 1e-6);
    }
    expect(s.left.afterburnerOn).toBe(true);
    expect(s.left.regime).toBe('AFTERBURNER');
    expect(s.left.nozzleOpenFraction).toBeGreaterThan(milNozzle);

    // Spool down to Idle is monotonic decreasing and uses slower spool-down tau
    s = setEngineThrottle(s, 0);
    let highN2 = s.left.n2Pct;
    for (let i = 0; i < 120; i++) {
      s = stepEngineSim(s, 0.1);
      expect(s.left.n2Pct).toBeLessThanOrEqual(highN2 + 1e-6);
      expect(s.left.n2Pct).toBeGreaterThanOrEqual(R.ENGINE_IDLE_N2_PCT.value - 0.5);
      highN2 = s.left.n2Pct;
    }
    expect(s.left.afterburnerOn).toBe(false);
    expect(s.left.regime).toBe('IDLE');
  });

  it('keeps cockpit engine MFD gauges strictly in sync with EngineSimState (Idle vs AB)', () => {
    const texts: string[] = [];
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'left',
      fillRect: () => {},
      strokeRect: () => {},
      fillText: (text: string) => {
        texts.push(text);
      },
    } as unknown as CanvasRenderingContext2D;

    const idleState = createEnginePresetState('idle');
    drawEngineMfdCanvas(mockCtx, idleState);
    expect(texts).toContain('AB: OFF');
    expect(texts).toContain(String(Math.round(idleState.left.n2Pct)));
    expect(texts.some((t) => t.includes('MODE: IDLE'))).toBe(true);

    texts.length = 0;
    const abState = createEnginePresetState('ab');
    drawEngineMfdCanvas(mockCtx, abState);
    expect(texts).toContain('AB: ON');
    expect(texts).toContain('100');
    expect(texts.some((t) => t.includes('MODE: AFTERBURNER'))).toBe(true);
  });
});
