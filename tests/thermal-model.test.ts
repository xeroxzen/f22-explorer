import { describe, expect, it } from 'vitest';
import { computeBraytonCycle, partIdToBraytonStation } from '../src/sim/braytonCycle.js';
import { createEnginePresetState } from '../src/sim/engineSim.js';
import { computeIsaStaticTempK, computeSkinHeating } from '../src/sim/skinHeating.js';

describe('v1.2 Ideal Brayton Cycle & Skin Heating Physics Models (COMPUTED)', () => {
  it('closes turbine/compressor energy balance within tolerance across idle, mil, and AB', () => {
    for (const preset of ['idle', 'mil', 'ab'] as const) {
      const sim = createEnginePresetState(preset);
      const cycle = computeBraytonCycle(sim.left);

      expect(cycle.disclaimer).toMatch(/F119 cycle not publicly disclosed/i);
      expect(cycle.workHptJKg).toBeCloseTo(cycle.workHpcJKg, 6);
      expect(cycle.workLptJKg).toBeCloseTo(cycle.workFanCoreJKg, 6);
      expect(cycle.energyBalanceResidualJKg).toBeLessThan(1e-6);
      expect(cycle.stations.combustor.label).toBe('COMPUTED');
    }
  });

  it('maintains physically monotonic station temperatures and sane nozzle exit pressure', () => {
    const idle = computeBraytonCycle(createEnginePresetState('idle').left);
    const mil = computeBraytonCycle(createEnginePresetState('mil').left);
    const ab = computeBraytonCycle(createEnginePresetState('ab').left);

    for (const c of [idle, mil, ab]) {
      const s = c.stations;
      // Compression raises total temperature: ambient < fan < hpc < combustor
      expect(s.ambient.totalTempK).toBeLessThan(s.fan.totalTempK);
      expect(s.fan.totalTempK).toBeLessThan(s.hpc.totalTempK);
      expect(s.hpc.totalTempK).toBeLessThan(s.combustor.totalTempK);
      // Turbine expansion lowers total temperature: combustor > hpt > lpt
      expect(s.combustor.totalTempK).toBeGreaterThan(s.hpt.totalTempK);
      expect(s.hpt.totalTempK).toBeGreaterThan(s.lpt.totalTempK);
      // Sane nozzle exit pressure ratio (> 1.0 and < 12.0 at sea level static)
      expect(c.nozzlePressureRatio).toBeGreaterThan(1.0);
      expect(c.nozzlePressureRatio).toBeLessThan(12.0);
      expect(s.nozzle.totalPressureKpa).toBeGreaterThan(101.3);
    }

    // Power-setting monotonicity: idle < mil < ab at nozzle exit
    expect(idle.stations.combustor.totalTempK).toBeLessThan(mil.stations.combustor.totalTempK);
    expect(mil.stations.augmentor.totalTempK).toBeCloseTo(mil.stations.lpt.totalTempK, 5);
    expect(ab.stations.augmentor.totalTempK).toBeGreaterThan(mil.stations.augmentor.totalTempK);
    expect(ab.stations.nozzle.totalTempK).toBeGreaterThan(mil.stations.nozzle.totalTempK);
  });

  it('maps all F119 cutaway part IDs to their Brayton station', () => {
    expect(partIdToBraytonStation('f119-fan-left')).toBe('fan');
    expect(partIdToBraytonStation('f119-hpc-right')).toBe('hpc');
    expect(partIdToBraytonStation('f119-combustor-left')).toBe('combustor');
    expect(partIdToBraytonStation('f119-hpt-right')).toBe('hpt');
    expect(partIdToBraytonStation('f119-lpt-left')).toBe('lpt');
    expect(partIdToBraytonStation('f119-augmentor-right')).toBe('augmentor');
    expect(partIdToBraytonStation('f119-nozzle-flaps-left')).toBe('nozzle');
    expect(partIdToBraytonStation('wing-left')).toBeNull();
  });

  it('computes ISA atmosphere and stagnation skin heating T0 = T * (1 + 0.2 * M^2)', () => {
    expect(computeIsaStaticTempK(0)).toBeCloseTo(288.15, 2);
    expect(computeIsaStaticTempK(11_000)).toBeCloseTo(216.65, 2);
    expect(computeIsaStaticTempK(15_000)).toBeCloseTo(216.65, 2);

    // Mach 0 at sea level -> T0 = 288.15 K (15 °C)
    const sl0 = computeSkinHeating(0, 0);
    expect(sl0.stagnationTempK).toBeCloseTo(288.15, 2);
    expect(sl0.formulaLabel).toBe('SOURCED');
    expect(sl0.resultLabel).toBe('COMPUTED');

    // Mach 2.0 at 12 km (stratosphere 216.65 K) -> T0 = 216.65 * (1 + 0.2 * 4) = 389.97 K (~116.8 °C)
    const m2 = computeSkinHeating(12_000, 2.0);
    expect(m2.stagnationTempK).toBeCloseTo(216.65 * 1.8, 2);
    expect(m2.stagnationTempC).toBeCloseTo(116.82, 1);
  });
});
