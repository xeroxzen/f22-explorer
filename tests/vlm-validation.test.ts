import { describe, expect, it } from 'vitest';
import {
  buildF22VlmMesh,
  buildRectangularWingMesh,
  buildTaperedWingMesh,
  factorVlmMesh,
  solveVlm,
  ZERO_DEFLECTIONS,
} from '../src/sim/vlmSolver.js';

const DEG = Math.PI / 180;

describe('v1.3 Horseshoe-Vortex VLM Textbook Validation (Katz & Plotkin 2nd ed. Ch. 12; Bertin & Cummings 6th ed. Ch. 7)', () => {
  it('matches Helmbold equation lift slope within 5% for a high-AR rectangular wing (AR = 10)', () => {
    const ar = 10;
    const mesh = buildRectangularWingMesh(10, 1, 20, 6);
    const factored = factorVlmMesh(mesh);

    const r0 = solveVlm(factored, {
      alphaDeg: 0,
      betaDeg: 0,
      mach: 0,
      polhamusVortexLift: false,
      deflections: ZERO_DEFLECTIONS,
    });
    const r5 = solveVlm(factored, {
      alphaDeg: 5,
      betaDeg: 0,
      mach: 0,
      polhamusVortexLift: false,
      deflections: ZERO_DEFLECTIONS,
    });

    const vlmClAlpha = (r5.cl - r0.cl) / (5 * DEG);
    // Helmbold equation (Bertin & Cummings 6th ed., Ch. 7): C_L_alpha = 2*pi*AR / (2 + sqrt(4 + AR^2))
    const helmboldClAlpha = (2 * Math.PI * ar) / (2 + Math.sqrt(4 + ar * ar));
    const relErr = Math.abs(vlmClAlpha - helmboldClAlpha) / helmboldClAlpha;

    console.log(
      `[VLM Validation 1] High-AR Rect Wing (AR=10): VLM CL_a=${vlmClAlpha.toFixed(4)} /rad vs Helmbold=${helmboldClAlpha.toFixed(4)} /rad (err=${(relErr * 100).toFixed(2)}%)`
    );
    expect(relErr).toBeLessThan(0.05);
  });

  it('achieves Trefftz-plane Oswald efficiency e ≈ 1.0 for an elliptic-like tapered wing (AR = 8, λ = 0.4)', () => {
    const mesh = buildTaperedWingMesh(11.2, 2.0, 0.8, 20, 6);
    const factored = factorVlmMesh(mesh);
    const res = solveVlm(factored, {
      alphaDeg: 5,
      betaDeg: 0,
      mach: 0,
      polhamusVortexLift: false,
      deflections: ZERO_DEFLECTIONS,
    });

    console.log(
      `[VLM Validation 2] Tapered Elliptic-Like Wing (AR=8, λ=0.4): CL=${res.cl.toFixed(4)}, CDi=${res.cdi.toFixed(5)}, e=${res.oswaldE.toFixed(4)}`
    );
    expect(res.oswaldE).toBeGreaterThanOrEqual(0.95);
    expect(res.oswaldE).toBeLessThanOrEqual(1.03);
  });

  it('enforces exact roll symmetry for symmetric deflections and zero lift change + correct roll sign for antisymmetric ailerons', () => {
    const mesh = buildF22VlmMesh();
    const factored = factorVlmMesh(mesh);

    const base = solveVlm(factored, {
      alphaDeg: 6,
      betaDeg: 0,
      mach: 0.3,
      polhamusVortexLift: false,
      deflections: ZERO_DEFLECTIONS,
    });

    // Symmetric flaperon deflection (+10 deg TE down on both wings) -> zero rolling moment, positive ΔCL
    const symFlap = solveVlm(factored, {
      alphaDeg: 6,
      betaDeg: 0,
      mach: 0.3,
      polhamusVortexLift: false,
      deflections: {
        ...ZERO_DEFLECTIONS,
        flaperonLeftDeg: 10,
        flaperonRightDeg: 10,
      },
    });
    console.log(
      `[VLM Validation 3a] F-22 Symmetric Flaperon (+10°): ΔCL=${(symFlap.cl - base.cl).toFixed(4)}, Cl=${symFlap.cRoll.toExponential(2)}`
    );
    expect(Math.abs(symFlap.cRoll)).toBeLessThan(1e-6);
    expect(symFlap.cl).toBeGreaterThan(base.cl);

    // Antisymmetric aileron (left +10° TE down, right -10° TE up -> right-wing-down positive roll, zero ΔCL)
    const antiAil = solveVlm(factored, {
      alphaDeg: 6,
      betaDeg: 0,
      mach: 0.3,
      polhamusVortexLift: false,
      deflections: {
        ...ZERO_DEFLECTIONS,
        aileronLeftDeg: 10,
        aileronRightDeg: -10,
      },
    });
    console.log(
      `[VLM Validation 3b] F-22 Antisymmetric Aileron (L+10°/R-10°): ΔCL=${(antiAil.cl - base.cl).toExponential(2)}, Cl=${antiAil.cRoll.toFixed(5)} (>0 right-wing-down)`
    );
    expect(Math.abs(antiAil.cl - base.cl)).toBeLessThan(1e-4);
    expect(antiAil.cRoll).toBeGreaterThan(0.005);
  });

  it('applies Prandtl-Glauert scaling up to M 0.70, freezes above M 0.70, and adds Polhamus vortex lift when toggled', () => {
    const mesh = buildF22VlmMesh();
    const factored = factorVlmMesh(mesh);

    const m0 = solveVlm(factored, {
      alphaDeg: 8,
      betaDeg: 0,
      mach: 0,
      polhamusVortexLift: false,
      deflections: ZERO_DEFLECTIONS,
    });
    const m06 = solveVlm(factored, {
      alphaDeg: 8,
      betaDeg: 0,
      mach: 0.6,
      polhamusVortexLift: false,
      deflections: ZERO_DEFLECTIONS,
    });
    const expectedRatio = 1 / Math.sqrt(1 - 0.6 * 0.6); // 1.25
    expect(m06.valid).toBe(true);
    expect(m06.cl / m0.cl).toBeCloseTo(expectedRatio, 4);

    // Above M 0.70 -> outside model validity, freezes coefficients (no extrapolation)
    const m075 = solveVlm(
      factored,
      {
        alphaDeg: 8,
        betaDeg: 0,
        mach: 0.75,
        polhamusVortexLift: false,
        deflections: ZERO_DEFLECTIONS,
      },
      m06
    );
    expect(m075.valid).toBe(false);
    expect(m075.validityMessage).toMatch(/outside model validity/i);
    expect(m075.cl).toBe(m06.cl);

    // Polhamus vortex-lift toggle (NASA TN D-3767) adds nonlinear vortex lift at high AoA
    const pot15 = solveVlm(factored, {
      alphaDeg: 15,
      betaDeg: 0,
      mach: 0.2,
      polhamusVortexLift: false,
      deflections: ZERO_DEFLECTIONS,
    });
    const pol15 = solveVlm(factored, {
      alphaDeg: 15,
      betaDeg: 0,
      mach: 0.2,
      polhamusVortexLift: true,
      deflections: ZERO_DEFLECTIONS,
    });
    console.log(
      `[VLM Validation 4] F-22 M=0.6 PG ratio=${(m06.cl / m0.cl).toFixed(4)} (exact 1.2500); Polhamus @15°: CL_pot=${pot15.cl.toFixed(4)} -> CL_tot=${pol15.cl.toFixed(4)}`
    );
    expect(pol15.clVortexIncrement).toBeGreaterThan(0.15);
    expect(pol15.cl).toBeGreaterThan(pot15.cl);
  });
});
