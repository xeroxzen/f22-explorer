import { describe, expect, it } from 'vitest';
import { getComponentContent } from '../src/content/registry.js';
import {
  COCKPIT_DISPLAY_DIMENSIONS_M,
  RENDERED_STORE_SPECS,
} from '../src/scene/storeDimensions.js';
import { CONSTANTS_REGISTRY as R } from '../src/sim/config/registry.js';

describe('F-22 Reference Geometry Consistency Checks', () => {
  it('matches exact sourced span, length, and height on the root airframe', () => {
    const airframe = getComponentContent('f22-airframe');
    expect(airframe).not.toBeNull();
    const [span, height, length] = airframe!.modelingNotes.approxSizeM;
    expect(span).toBe(R.F22_WINGSPAN_M.value);
    expect(height).toBe(R.F22_HEIGHT_M.value);
    expect(length).toBe(R.F22_LENGTH_M.value);
    expect(airframe!.modelingNotes.stationRangeM[0]).toBe(0);
    expect(airframe!.modelingNotes.stationRangeM[1]).toBe(R.F22_LENGTH_M.value);
  });

  it('computes trapezoidal wing planform area within 5% of 78.04 m²', () => {
    const span = R.F22_WINGSPAN_M.value;
    const halfSpan = span / 2;
    const cRootCl = R.F22_WING_ROOT_CHORD_CL_M.value;
    const leSweepRad = (R.F22_WING_LE_SWEEP_DEG.value * Math.PI) / 180;
    const teSweepRad = (R.F22_WING_TE_SWEEP_DEG.value * Math.PI) / 180;

    // Tip chord derived from sweep angles (negative TE sweep = forward sweep)
    const derivedTipChord = cRootCl - halfSpan * (Math.tan(leSweepRad) - Math.tan(teSweepRad));
    expect(Math.abs(derivedTipChord - R.F22_WING_TIP_CHORD_M.value)).toBeLessThan(0.05);

    const computedAreaM2 = span * ((cRootCl + R.F22_WING_TIP_CHORD_M.value) / 2);
    const relErr = Math.abs(computedAreaM2 - R.F22_WING_AREA_M2.value) / R.F22_WING_AREA_M2.value;
    expect(relErr).toBeLessThan(0.05);
  });

  it('places vertical stabilizer tip consistent with 28° outward cant and 5.08 m height', () => {
    const dx = R.F22_VTAIL_TIP_X_M.value - R.F22_VTAIL_ROOT_X_M.value;
    const dy = R.F22_VTAIL_TIP_Y_M.value - R.F22_VTAIL_ROOT_Y_M.value;
    const cantDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
    expect(R.F22_VTAIL_TIP_Y_M.value).toBe(R.F22_HEIGHT_M.value);
    expect(Math.abs(cantDeg - R.F22_VTAIL_CANT_DEG.value)).toBeLessThan(0.5);
  });

  it('sizes main and side weapons bays to contain reference stores with clearance', () => {
    const mainBay = getComponentContent('main-weapons-bay');
    const sideBayL = getComponentContent('side-weapons-bay-left');
    const sideBayR = getComponentContent('side-weapons-bay-right');
    expect(mainBay).not.toBeNull();
    expect(sideBayL).not.toBeNull();
    expect(sideBayR).not.toBeNull();

    // Main bay must hold AIM-120 (3.66 m) with >= 0.4 m longitudinal clearance
    const mainBayLen = mainBay!.modelingNotes.approxSizeM[2];
    const mainBayWidth = mainBay!.modelingNotes.approxSizeM[0];
    expect(mainBayLen).toBeGreaterThanOrEqual(R.AIM120_LENGTH_M.value + 0.4);
    expect(mainBayWidth).toBeGreaterThanOrEqual(1.8); // 6 × AIM-120 (~0.18 m dia) + launchers

    // Side bays must hold AIM-9 (3.02 m) with >= 0.25 m longitudinal clearance
    expect(sideBayL!.modelingNotes.approxSizeM[2]).toBeGreaterThanOrEqual(
      R.AIM9_LENGTH_M.value + 0.25
    );
    expect(sideBayR!.modelingNotes.approxSizeM[2]).toBeGreaterThanOrEqual(
      R.AIM9_LENGTH_M.value + 0.25
    );
  });

  it('ensures sequential solid fuselage hull sections do not overlap in station range', () => {
    const hullOrder = [
      'radome',
      'forward-fuselage',
      'center-fuselage',
      'aft-fuselage',
      'tail-booms',
    ] as const;

    const stations = hullOrder.map((id) => {
      const p = getComponentContent(id);
      expect(p, `Missing hull section ${id}`).not.toBeNull();
      return { id, range: p!.modelingNotes.stationRangeM };
    });

    for (let i = 0; i < stations.length - 1; i++) {
      const curr = stations[i]!;
      const next = stations[i + 1]!;
      expect(
        curr.range[1],
        `Hull section ${curr.id} ends at ${curr.range[1]} m after ${next.id} starts at ${next.range[0]} m`
      ).toBeLessThanOrEqual(next.range[0] + 1e-6);
    }

    // Nozzles start at aft-fuselage end (16.90 m) and do not exceed aircraft length (18.92 m)
    for (const id of ['nozzle-2d-left', 'nozzle-2d-right'] as const) {
      const noz = getComponentContent(id)!;
      expect(noz.modelingNotes.stationRangeM[0]).toBeGreaterThanOrEqual(16.9);
      expect(noz.modelingNotes.stationRangeM[1]).toBeLessThanOrEqual(R.F22_LENGTH_M.value);
    }
  });

  it('matches rendered store lengths within 5% of cited USAF Fact Sheet lengths (and 4×2 SDB racks)', () => {
    for (const store of Object.values(RENDERED_STORE_SPECS)) {
      const relErr =
        Math.abs(store.renderedLengthM - store.sourcedLengthM) / store.sourcedLengthM;
      expect(
        relErr,
        `${store.id}: rendered ${store.renderedLengthM} m vs sourced ${store.sourcedLengthM} m`
      ).toBeLessThan(0.05);
    }
    expect(R.GBU39_PER_RACK.value).toBe(4);
    expect(R.GBU39_RACKS_IN_MAIN_BAY.value).toBe(2);
    expect(R.GBU39_PER_RACK.value * R.GBU39_RACKS_IN_MAIN_BAY.value).toBe(8);
  });

  it('sizes cockpit LCDs to Lockheed Martin Code One sourced dimensions (8×8, 6.5×6.5, 3×4 in)', () => {
    const IN_TO_M = 0.0254;
    expect(COCKPIT_DISPLAY_DIMENSIONS_M.primaryMfd.width).toBeCloseTo(8 * IN_TO_M, 4);
    expect(COCKPIT_DISPLAY_DIMENSIONS_M.primaryMfd.height).toBeCloseTo(8 * IN_TO_M, 4);
    expect(COCKPIT_DISPLAY_DIMENSIONS_M.secondaryMfd.width).toBeCloseTo(6.5 * IN_TO_M, 4);
    expect(COCKPIT_DISPLAY_DIMENSIONS_M.secondaryMfd.height).toBeCloseTo(6.5 * IN_TO_M, 4);
    expect(COCKPIT_DISPLAY_DIMENSIONS_M.upFrontDisplay.width).toBeCloseTo(4 * IN_TO_M, 4);
    expect(COCKPIT_DISPLAY_DIMENSIONS_M.upFrontDisplay.height).toBeCloseTo(3 * IN_TO_M, 4);
  });
});
