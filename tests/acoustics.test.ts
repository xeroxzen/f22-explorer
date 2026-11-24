import { describe, expect, it } from 'vitest';
import { evaluateAcoustics } from '../src/audio/acoustics.js';
import { ExplorerSoundEngine } from '../src/audio/soundEngine.js';

describe('Hangar & engine acoustic model', () => {
  it('attenuates loudness and lowers LPF cutoff as listener moves farther away', () => {
    const near = evaluateAcoustics({
      sourcePosM: { x: 0, y: 1.5, z: -6 },
      listenerPosM: { x: 0, y: 1.5, z: 4 },
      isInterior: false,
      running: true,
      spoolFraction: 0.85,
      afterburnerFraction: 0.5,
      activeEngineCount: 2,
    });
    const far = evaluateAcoustics({
      sourcePosM: { x: 0, y: 1.5, z: -6 },
      listenerPosM: { x: 0, y: 1.5, z: 94 },
      isInterior: false,
      running: true,
      spoolFraction: 0.85,
      afterburnerFraction: 0.5,
      activeEngineCount: 2,
    });

    expect(near.continuousMuted).toBe(false);
    expect(far.distanceM).toBeGreaterThan(near.distanceM);
    expect(far.rumbleGain).toBeLessThan(near.rumbleGain);
    expect(far.roarGain).toBeLessThan(near.roarGain);
    expect(far.lpfCutoffHz).toBeLessThan(near.lpfCutoffHz);
    expect(far.delayS).toBeCloseTo(far.distanceM / far.speedOfSoundMs, 4);
  });

  it('muffles external buses and activates interior hum when inside cockpit', () => {
    const cockpit = evaluateAcoustics({
      sourcePosM: { x: 0, y: 1.5, z: -6 },
      listenerPosM: { x: 0, y: 2.2, z: 4 },
      isInterior: true,
      running: true,
      spoolFraction: 0.7,
      afterburnerFraction: 0,
      activeEngineCount: 2,
    });

    expect(cockpit.delayS).toBe(0);
    expect(cockpit.lpfCutoffHz).toBeLessThanOrEqual(400);
    expect(cockpit.interiorGain).toBeGreaterThan(0.3);
  });

  it('is muted by default in ExplorerSoundEngine', () => {
    const engine = new ExplorerSoundEngine();
    expect(engine.isMuted()).toBe(true);
    const dbg = engine.getDebugState();
    expect(dbg.muted).toBe(true);
    expect(dbg.hasAudioContext).toBe(false);
  });

  it('produces APU whine during autonomous start before main engines light off', () => {
    const apuOnly = evaluateAcoustics({
      sourcePosM: { x: 0, y: 2.0, z: 7.5 },
      listenerPosM: { x: 7, y: 4, z: 16 },
      isInterior: false,
      running: true,
      spoolFraction: 0,
      afterburnerFraction: 0,
      activeEngineCount: 0,
      apuSpoolFraction: 1.0,
    });
    expect(apuOnly.continuousMuted).toBe(false);
    expect(apuOnly.whineGain).toBeGreaterThan(0.1);
    expect(apuOnly.roarGain).toBe(0);
    expect(apuOnly.crackleGain).toBe(0);
  });
});
