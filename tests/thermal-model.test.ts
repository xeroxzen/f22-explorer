import { describe, expect, it } from 'vitest';
import { computeBraytonCycle, partIdToBraytonStation } from '../src/sim/braytonCycle.js';
import { CONSTANTS_REGISTRY as R } from '../src/sim/config/registry.js';
import { createEnginePresetState } from '../src/sim/engineSim.js';
import { computeIsaStaticTempK, computeSkinHeating } from '../src/sim/skinHeating.js';

describe('v1.2 SAE ARP755 Brayton Cycle & Skin Heating Physics Models (COMPUTED)', () => {
  it('satisfies independent first-law control-volume energy balance (ΣH_in + Q_fuel = ΣH_out) across idle, mil, and AB', () => {
    const cpC = R.AIR_CP_COLD_J_KG_K.value;
    const cpH = R.GAS_CP_HOT_J_KG_K.value;
    const bpr = R.F119_BYPASS_RATIO_APPROX.value;
    const lhv = R.JET_FUEL_LHV_J_KG.value;

    for (const preset of ['idle', 'mil', 'ab'] as const) {
      const sim = createEnginePresetState(preset);
      const cycle = computeBraytonCycle(sim.left);

      expect(cycle.disclaimer).toMatch(/F119 cycle not publicly disclosed/i);
      expect(cycle.stations['4'].label).toBe('COMPUTED');
      expect(cycle.fuelAirRatioCore).toBeGreaterThan(0);

      // Independent first-law check across entire engine control volume (0 -> 8, static run, no shaft output)
      const hIn = (1 + bpr) * cpC * cycle.stations['0'].totalTempK;
      const qFuel = (cycle.fuelAirRatioCore + cycle.fuelAirRatioAb) * lhv;
      const hOut = (cpH + bpr * cpC) * cycle.stations['8'].totalTempK;

      const relErr = Math.abs(hIn + qFuel - hOut) / hOut;
      expect(relErr, `First-law relative error at ${preset}: ${relErr}`).toBeLessThan(1e-6);
    }
  });

  it('maintains SAE ARP755 station ordering, bypass/core mixer physics, monotonic temperatures & sane nozzle exit pressure', () => {
    const idle = computeBraytonCycle(createEnginePresetState('idle').left);
    const mil = computeBraytonCycle(createEnginePresetState('mil').left);
    const ab = computeBraytonCycle(createEnginePresetState('ab').left);

    for (const c of [idle, mil, ab]) {
      const s = c.stations;
      // Compression raises total temperature: 0/2 < 13/25 < 3 < 4
      expect(s['0'].totalTempK).toBeCloseTo(s['2'].totalTempK, 6);
      expect(s['2'].totalTempK).toBeLessThan(s['13'].totalTempK);
      expect(s['13'].totalTempK).toBeCloseTo(s['25'].totalTempK, 6);
      expect(s['25'].totalTempK).toBeLessThan(s['3'].totalTempK);
      expect(s['3'].totalTempK).toBeLessThan(s['4'].totalTempK);

      // Turbine expansion lowers total temperature: 4 > 45 > 5
      expect(s['4'].totalTempK).toBeGreaterThan(s['45'].totalTempK);
      expect(s['45'].totalTempK).toBeGreaterThan(s['5'].totalTempK);

      // Mixer (Stn 6) sits strictly between cool bypass (Stn 13) and hot LPT exit (Stn 5)
      expect(s['6'].totalTempK).toBeGreaterThan(s['13'].totalTempK);
      expect(s['6'].totalTempK).toBeLessThan(s['5'].totalTempK);

      // Sane nozzle throat pressure ratio (> 1.0 and < 12.0 at sea-level static)
      expect(c.nozzlePressureRatio).toBeGreaterThan(1.0);
      expect(c.nozzlePressureRatio).toBeLessThan(12.0);
      expect(s['8'].totalPressureKpa).toBeGreaterThan(101.3);
    }

    // Power-setting monotonicity: idle < mil < ab at nozzle exit
    expect(idle.stations['4'].totalTempK).toBeLessThan(mil.stations['4'].totalTempK);
    expect(mil.stations['7'].totalTempK).toBeCloseTo(mil.stations['6'].totalTempK, 5);
    expect(ab.stations['7'].totalTempK).toBeGreaterThan(mil.stations['7'].totalTempK);
    expect(ab.stations['8'].totalTempK).toBeGreaterThan(mil.stations['8'].totalTempK);
  });

  it('maps all F119 cutaway part IDs to their SAE ARP755 station', () => {
    expect(partIdToBraytonStation('f119-fan-left')).toBe('13');
    expect(partIdToBraytonStation('f119-hpc-right')).toBe('3');
    expect(partIdToBraytonStation('f119-combustor-left')).toBe('4');
    expect(partIdToBraytonStation('f119-hpt-right')).toBe('45');
    expect(partIdToBraytonStation('f119-lpt-left')).toBe('5');
    expect(partIdToBraytonStation('f119-augmentor-right')).toBe('7');
    expect(partIdToBraytonStation('f119-nozzle-flaps-left')).toBe('8');
    expect(partIdToBraytonStation('wing-left')).toBeNull();
  });

  it('computes ISA atmosphere and stagnation skin heating T0 = T * (1 + 0.2 * M^2)', () => {
    expect(computeIsaStaticTempK(0)).toBeCloseTo(288.15, 2);
    expect(computeIsaStaticTempK(11_000)).toBeCloseTo(216.65, 2);
    expect(computeIsaStaticTempK(15_000)).toBeCloseTo(216.65, 2);

    const sl0 = computeSkinHeating(0, 0);
    expect(sl0.stagnationTempK).toBeCloseTo(288.15, 2);
    expect(sl0.formulaLabel).toBe('SOURCED');
    expect(sl0.resultLabel).toBe('COMPUTED');

    const m2 = computeSkinHeating(12_000, 2.0);
    expect(m2.stagnationTempK).toBeCloseTo(216.65 * 1.8, 2);
    expect(m2.stagnationTempC).toBeCloseTo(116.82, 1);
  });
});
