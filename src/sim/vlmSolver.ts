import { CONSTANTS_REGISTRY as R } from './config/registry.js';

export type Vec3 = readonly [number, number, number];

export type VlmSurfaceId =
  | 'wing-left'
  | 'wing-right'
  | 'stab-left'
  | 'stab-right'
  | 'vtail-left'
  | 'vtail-right';

export type VlmControlId =
  | 'none'
  | 'lef-left'
  | 'lef-right'
  | 'flaperon-left'
  | 'flaperon-right'
  | 'aileron-left'
  | 'aileron-right'
  | 'stab-left'
  | 'stab-right'
  | 'rudder-left'
  | 'rudder-right';

export interface VlmPanel {
  readonly index: number;
  readonly surface: VlmSurfaceId;
  readonly control: VlmControlId;
  readonly spanStripIndex: number;
  readonly p00: Vec3;
  readonly p10: Vec3;
  readonly p01: Vec3;
  readonly p11: Vec3;
  /** Bound vortex endpoints (A -> B along local 1/4 chord, directed left-to-right on horizontal surfaces). */
  readonly vortexA: Vec3;
  readonly vortexB: Vec3;
  /** Collocation (control) point at local 3/4 chord mid-span. */
  readonly collocation: Vec3;
  readonly normal: Vec3;
  readonly chordDir: Vec3;
  readonly areaM2: number;
  readonly chordM: number;
  readonly spanWidthM: number;
}

export interface VlmSpanStrip {
  readonly index: number;
  readonly surface: VlmSurfaceId;
  readonly ySpanM: number;
  readonly zMidM: number;
  readonly yElevM: number;
  readonly chordM: number;
  readonly widthM: number;
  readonly vortexA: Vec3;
  readonly vortexB: Vec3;
  readonly normal: Vec3;
  readonly panelIndices: readonly number[];
}

export interface VlmMesh {
  readonly panels: readonly VlmPanel[];
  readonly strips: readonly VlmSpanStrip[];
  readonly refAreaM2: number;
  readonly refSpanM: number;
  readonly refMacM: number;
  readonly refMomentCenter: Vec3;
}

export interface FactoredVlmSystem {
  readonly mesh: VlmMesh;
  readonly n: number;
  readonly lu: Float64Array;
  readonly piv: Int32Array;
  readonly factorTimeMs: number;
}

export interface VlmControlDeflections {
  readonly lefDeg: number;
  readonly flaperonLeftDeg: number;
  readonly flaperonRightDeg: number;
  readonly aileronLeftDeg: number;
  readonly aileronRightDeg: number;
  readonly stabilatorLeftDeg: number;
  readonly stabilatorRightDeg: number;
  readonly rudderLeftDeg: number;
  readonly rudderRightDeg: number;
}

export interface VlmSolveInput {
  readonly alphaDeg: number;
  readonly betaDeg: number;
  readonly mach: number;
  readonly polhamusVortexLift: boolean;
  readonly deflections: VlmControlDeflections;
}

export interface SpanwiseLiftPoint {
  readonly xSpanM: number;
  readonly yElevM: number;
  readonly zMidM: number;
  readonly chordM: number;
  readonly cl: number;
  readonly cClOverCref: number;
}

export interface VlmSolveResult {
  readonly valid: boolean;
  readonly validityMessage: string | null;
  readonly label: 'COMPUTED';
  readonly mach: number;
  readonly betaPG: number;
  readonly alphaDeg: number;
  readonly betaDeg: number;
  readonly cl: number;
  readonly clPotential: number;
  readonly clVortexIncrement: number;
  readonly cdi: number;
  readonly oswaldE: number;
  readonly cRoll: number;
  readonly cPitch: number;
  readonly cYaw: number;
  readonly panelGamma: Float64Array;
  readonly panelDeltaCp: Float64Array;
  readonly spanwiseWingLift: readonly SpanwiseLiftPoint[];
  readonly solveTimeMs: number;
}

export const ZERO_DEFLECTIONS: VlmControlDeflections = {
  lefDeg: 0,
  flaperonLeftDeg: 0,
  flaperonRightDeg: 0,
  aileronLeftDeg: 0,
  aileronRightDeg: 0,
  stabilatorLeftDeg: 0,
  stabilatorRightDeg: 0,
  rudderLeftDeg: 0,
  rudderRightDeg: 0,
};

const INV_4PI = 1 / (2 * 2 * Math.PI); // SOURCED: Biot-Savart 1/(4*pi) factor
const INV_2PI = 1 / (2 * Math.PI); // SOURCED: 2D Trefftz-plane 1/(2*pi) factor
const EPS_TINY = 1e-12; // HEURISTIC: numerical zero guard

function cross3(a: Vec3, b: Vec3): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize3(v: Vec3): Vec3 {
  const n = norm3(v);
  return n > EPS_TINY ? [v[0] / n, v[1] / n, v[2] / n] : [0, 1, 0];
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function fsToZ(fs: number): number {
  return fs - R.F22_LENGTH_M.value / 2;
}

function wingLeFs(absX: number): number {
  const leSweepRad = R.F22_WING_LE_SWEEP_DEG.value * R.DEG_TO_RAD.value;
  const rootLe = R.F22_WING_ROOT_CHORD_CL_M.value / 2;
  return (
    R.F22_LENGTH_M.value / 2 -
    rootLe +
    (absX - R.F22_WING_ROOT_X_M.value) * Math.tan(leSweepRad)
  );
}

function wingTeFs(absX: number): number {
  const teSweepRad = R.F22_WING_TE_SWEEP_DEG.value * R.DEG_TO_RAD.value;
  const rootChord = R.F22_WING_ROOT_CHORD_CL_M.value;
  const rootLeFs = R.F22_LENGTH_M.value / 2 - rootChord / 2;
  const teRootFs = rootLeFs + rootChord;
  return teRootFs + (absX - R.F22_WING_ROOT_X_M.value) * Math.tan(teSweepRad);
}

interface QuadSurfaceSpec {
  readonly surface: VlmSurfaceId;
  readonly rootLe: Vec3;
  readonly rootTe: Vec3;
  readonly tipLe: Vec3;
  readonly tipTe: Vec3;
  readonly nSpan: number;
  readonly nChord: number;
  readonly orientSpanLeftToRight: boolean;
  readonly controlAt: (spanFrac: number, chordFrac: number) => VlmControlId;
}

function appendSurfacePanels(
  spec: QuadSurfaceSpec,
  panels: VlmPanel[],
  strips: VlmSpanStrip[]
): void {
  const qChord = R.VLM_QUARTER_CHORD_FRAC.value;
  const tqChord = R.VLM_THREE_QUARTER_CHORD_FRAC.value;

  for (let i = 0; i < spec.nSpan; i++) {
    const s0 = i / spec.nSpan;
    const s1 = (i + 1) / spec.nSpan;
    const sMid = (s0 + s1) / 2;

    const leA = lerp3(spec.rootLe, spec.tipLe, spec.orientSpanLeftToRight ? s0 : s1);
    const teA = lerp3(spec.rootTe, spec.tipTe, spec.orientSpanLeftToRight ? s0 : s1);
    const leB = lerp3(spec.rootLe, spec.tipLe, spec.orientSpanLeftToRight ? s1 : s0);
    const teB = lerp3(spec.rootTe, spec.tipTe, spec.orientSpanLeftToRight ? s1 : s0);

    const stripIdx = strips.length;
    const stripPanelIndices: number[] = [];

    const stripLeMid = lerp3(leA, leB, 1 / 2);
    const stripTeMid = lerp3(teA, teB, 1 / 2);
    const stripChordM = norm3([
      stripTeMid[0] - stripLeMid[0],
      stripTeMid[1] - stripLeMid[1],
      stripTeMid[2] - stripLeMid[2],
    ]);
    const stripSpanVec: Vec3 = [leB[0] - leA[0], leB[1] - leA[1], leB[2] - leA[2]];
    const stripChordVec: Vec3 = [
      stripTeMid[0] - stripLeMid[0],
      stripTeMid[1] - stripLeMid[1],
      stripTeMid[2] - stripLeMid[2],
    ];
    // Outward normal: chord (+Z) x span (+X) = +Y (upward on wings/stabs, outward on vtails)
    const stripNormal = normalize3(cross3(stripChordVec, stripSpanVec));
    const stripWidthM = Math.hypot(leB[0] - leA[0], leB[1] - leA[1]);

    for (let j = 0; j < spec.nChord; j++) {
      const c0 = j / spec.nChord;
      const c1 = (j + 1) / spec.nChord;
      const cMid = (c0 + c1) / 2;

      const p00 = lerp3(leA, teA, c0);
      const p10 = lerp3(leB, teB, c0);
      const p01 = lerp3(leA, teA, c1);
      const p11 = lerp3(leB, teB, c1);

      const vortexA = lerp3(p00, p01, qChord);
      const vortexB = lerp3(p10, p11, qChord);
      const colA = lerp3(p00, p01, tqChord);
      const colB = lerp3(p10, p11, tqChord);
      const collocation = lerp3(colA, colB, 1 / 2);

      const diag1: Vec3 = [p11[0] - p00[0], p11[1] - p00[1], p11[2] - p00[2]];
      const diag2: Vec3 = [p01[0] - p10[0], p01[1] - p10[1], p01[2] - p10[2]];
      const areaVec = cross3(diag1, diag2);
      const areaM2 = norm3(areaVec) / 2;
      const chordVec: Vec3 = [
        (p01[0] + p11[0] - p00[0] - p10[0]) / 2,
        (p01[1] + p11[1] - p00[1] - p10[1]) / 2,
        (p01[2] + p11[2] - p00[2] - p10[2]) / 2,
      ];
      const chordM = norm3(chordVec);
      const chordDir = normalize3(chordVec);
      const spanWidthM = norm3([
        vortexB[0] - vortexA[0],
        vortexB[1] - vortexA[1],
        vortexB[2] - vortexA[2],
      ]);

      const panelIdx = panels.length;
      stripPanelIndices.push(panelIdx);
      panels.push({
        index: panelIdx,
        surface: spec.surface,
        control: spec.controlAt(sMid, cMid),
        spanStripIndex: stripIdx,
        p00,
        p10,
        p01,
        p11,
        vortexA,
        vortexB,
        collocation,
        normal: stripNormal,
        chordDir,
        areaM2,
        chordM,
        spanWidthM,
      });
    }

    strips.push({
      index: stripIdx,
      surface: spec.surface,
      ySpanM: (leA[0] + leB[0]) / 2,
      yElevM: (leA[1] + leB[1]) / 2,
      zMidM: (stripLeMid[2] + stripTeMid[2]) / 2,
      chordM: stripChordM,
      widthM: stripWidthM,
      vortexA: lerp3(leA, teA, qChord),
      vortexB: lerp3(leB, teB, qChord),
      normal: stripNormal,
      panelIndices: stripPanelIndices,
    });
  }
}

/**
 * Generic rectangular wing mesh for textbook Helmbold-equation validation (Katz & Plotkin Ch. 12).
 */
export function buildRectangularWingMesh(
  spanM: number,
  chordM: number,
  nSpanHalf: number,
  nChord: number
): VlmMesh {
  const half = spanM / 2;
  const panels: VlmPanel[] = [];
  const strips: VlmSpanStrip[] = [];

  appendSurfacePanels(
    {
      surface: 'wing-left',
      rootLe: [0, 0, 0],
      rootTe: [0, 0, chordM],
      tipLe: [-half, 0, 0],
      tipTe: [-half, 0, chordM],
      nSpan: nSpanHalf,
      nChord,
      orientSpanLeftToRight: false,
      controlAt: () => 'none',
    },
    panels,
    strips
  );
  appendSurfacePanels(
    {
      surface: 'wing-right',
      rootLe: [0, 0, 0],
      rootTe: [0, 0, chordM],
      tipLe: [half, 0, 0],
      tipTe: [half, 0, chordM],
      nSpan: nSpanHalf,
      nChord,
      orientSpanLeftToRight: true,
      controlAt: () => 'none',
    },
    panels,
    strips
  );

  return {
    panels,
    strips,
    refAreaM2: spanM * chordM,
    refSpanM: spanM,
    refMacM: chordM,
    refMomentCenter: [0, 0, chordM * R.VLM_QUARTER_CHORD_FRAC.value],
  };
}

/**
 * Generic tapered wing mesh for elliptic-loading Oswald efficiency validation (λ ≈ 0.4 -> e ≈ 1).
 */
export function buildTaperedWingMesh(
  spanM: number,
  rootChordM: number,
  tipChordM: number,
  nSpanHalf: number,
  nChord: number
): VlmMesh {
  const half = spanM / 2;
  const q = R.VLM_QUARTER_CHORD_FRAC.value;
  // Unswept quarter-chord line so lift is cleanly elliptic-like
  const tipLeZ = (rootChordM - tipChordM) * q;
  const panels: VlmPanel[] = [];
  const strips: VlmSpanStrip[] = [];

  appendSurfacePanels(
    {
      surface: 'wing-left',
      rootLe: [0, 0, 0],
      rootTe: [0, 0, rootChordM],
      tipLe: [-half, 0, tipLeZ],
      tipTe: [-half, 0, tipLeZ + tipChordM],
      nSpan: nSpanHalf,
      nChord,
      orientSpanLeftToRight: false,
      controlAt: () => 'none',
    },
    panels,
    strips
  );
  appendSurfacePanels(
    {
      surface: 'wing-right',
      rootLe: [0, 0, 0],
      rootTe: [0, 0, rootChordM],
      tipLe: [half, 0, tipLeZ],
      tipTe: [half, 0, tipLeZ + tipChordM],
      nSpan: nSpanHalf,
      nChord,
      orientSpanLeftToRight: true,
      controlAt: () => 'none',
    },
    panels,
    strips
  );

  const area = ((rootChordM + tipChordM) / 2) * spanM;
  const lam = tipChordM / rootChordM;
  const mac = (2 / (2 + 1)) * rootChordM * ((1 + lam + lam * lam) / (1 + lam));
  return {
    panels,
    strips,
    refAreaM2: area,
    refSpanM: spanM,
    refMacM: mac,
    refMomentCenter: [0, 0, rootChordM * q],
  };
}

/**
 * F-22 aero reference planform VLM mesh (clipped-diamond wings, all-moving stabilators,
 * 28° outward-canted twin vertical tails) built from CONSTANTS_REGISTRY parameters.
 */
export function buildF22VlmMesh(
  nWingSpan = R.VLM_DEFAULT_WING_SPAN_PANELS.value,
  nWingChord = R.VLM_DEFAULT_WING_CHORD_PANELS.value
): VlmMesh {
  const panels: VlmPanel[] = [];
  const strips: VlmSpanStrip[] = [];

  const halfSpan = R.F22_WINGSPAN_M.value / 2;
  const wingRootX = R.F22_WING_ROOT_X_M.value;
  const wingY = R.VLM_WING_Y_M.value;

  const wRootLeZ = fsToZ(wingLeFs(wingRootX));
  const wRootTeZ = fsToZ(wingTeFs(wingRootX));
  const wTipLeZ = fsToZ(wingLeFs(halfSpan));
  const wTipTeZ = fsToZ(wingTeFs(halfSpan));

  const lefEnd = R.VLM_LEF_CHORD_END.value;
  const flpStart = R.VLM_FLAPERON_CHORD_START.value;
  const ailSpanStart = R.VLM_AILERON_SPAN_START.value;

  for (const side of [-1, 1] as const) {
    const lr = side === -1 ? 'left' : 'right';
    appendSurfacePanels(
      {
        surface: `wing-${lr}`,
        rootLe: [side * wingRootX, wingY, wRootLeZ],
        rootTe: [side * wingRootX, wingY, wRootTeZ],
        tipLe: [side * halfSpan, wingY, wTipLeZ],
        tipTe: [side * halfSpan, wingY, wTipTeZ],
        nSpan: nWingSpan,
        nChord: nWingChord,
        orientSpanLeftToRight: side === 1,
        controlAt: (sFrac, cFrac) => {
          if (cFrac <= lefEnd) return `lef-${lr}`;
          if (cFrac >= flpStart) {
            return sFrac < ailSpanStart ? `flaperon-${lr}` : `aileron-${lr}`;
          }
          return 'none';
        },
      },
      panels,
      strips
    );

    // All-moving horizontal stabilators
    appendSurfacePanels(
      {
        surface: `stab-${lr}`,
        rootLe: [side * R.VLM_STAB_ROOT_X_M.value, wingY, fsToZ(R.VLM_STAB_ROOT_LE_FS_M.value)],
        rootTe: [side * R.VLM_STAB_ROOT_X_M.value, wingY, fsToZ(R.VLM_STAB_ROOT_TE_FS_M.value)],
        tipLe: [side * R.VLM_STAB_TIP_X_M.value, wingY, fsToZ(R.VLM_STAB_TIP_LE_FS_M.value)],
        tipTe: [side * R.VLM_STAB_TIP_X_M.value, wingY, fsToZ(R.VLM_STAB_TIP_TE_FS_M.value)],
        nSpan: R.VLM_DEFAULT_STAB_SPAN_PANELS.value,
        nChord: R.VLM_DEFAULT_STAB_CHORD_PANELS.value,
        orientSpanLeftToRight: side === 1,
        controlAt: () => `stab-${lr}`,
      },
      panels,
      strips
    );

    // 28° outward-canted vertical tails & rudders
    appendSurfacePanels(
      {
        surface: `vtail-${lr}`,
        rootLe: [
          side * R.F22_VTAIL_ROOT_X_M.value,
          R.F22_VTAIL_ROOT_Y_M.value,
          fsToZ(R.VLM_VTAIL_ROOT_LE_FS_M.value),
        ],
        rootTe: [
          side * R.F22_VTAIL_ROOT_X_M.value,
          R.F22_VTAIL_ROOT_Y_M.value,
          fsToZ(R.VLM_VTAIL_ROOT_TE_FS_M.value),
        ],
        tipLe: [
          side * R.F22_VTAIL_TIP_X_M.value,
          R.F22_VTAIL_TIP_Y_M.value,
          fsToZ(R.VLM_VTAIL_TIP_LE_FS_M.value),
        ],
        tipTe: [
          side * R.F22_VTAIL_TIP_X_M.value,
          R.F22_VTAIL_TIP_Y_M.value,
          fsToZ(R.VLM_VTAIL_TIP_TE_FS_M.value),
        ],
        nSpan: R.VLM_DEFAULT_VTAIL_SPAN_PANELS.value,
        nChord: R.VLM_DEFAULT_VTAIL_CHORD_PANELS.value,
        orientSpanLeftToRight: side === 1,
        controlAt: (_sFrac, cFrac) =>
          cFrac >= R.VLM_RUDDER_CHORD_START.value ? `rudder-${lr}` : 'none',
      },
      panels,
      strips
    );
  }

  const macApprox = R.F22_WING_AREA_M2.value / R.F22_WINGSPAN_M.value;
  return {
    panels,
    strips,
    refAreaM2: R.F22_WING_AREA_M2.value,
    refSpanM: R.F22_WINGSPAN_M.value,
    refMacM: macApprox,
    refMomentCenter: [0, wingY, fsToZ(R.F22_LENGTH_M.value / 2)],
  };
}

/**
 * Unit-strength horseshoe vortex Biot-Savart induced velocity at point P:
 * bound segment A -> B plus semi-infinite wake legs along +Z.
 */
function horseshoeVelocity(
  p: Vec3,
  a: Vec3,
  b: Vec3,
  coreRadiusSq: number
): [number, number, number] {
  const r1x = p[0] - a[0];
  const r1y = p[1] - a[1];
  const r1z = p[2] - a[2];
  const r2x = p[0] - b[0];
  const r2y = p[1] - b[1];
  const r2z = p[2] - b[2];

  const r1 = Math.hypot(r1x, r1y, r1z);
  const r2 = Math.hypot(r2x, r2y, r2z);

  let vx = 0;
  let vy = 0;
  let vz = 0;

  // 1. Bound segment A -> B
  if (r1 > EPS_TINY && r2 > EPS_TINY) {
    const cx = r1y * r2z - r1z * r2y;
    const cy = r1z * r2x - r1x * r2z;
    const cz = r1x * r2y - r1y * r2x;
    const dlx = b[0] - a[0];
    const dly = b[1] - a[1];
    const dlz = b[2] - a[2];
    const dlSq = dlx * dlx + dly * dly + dlz * dlz;
    const denom = cx * cx + cy * cy + cz * cz + coreRadiusSq * dlSq;
    if (denom > EPS_TINY) {
      const proj =
        dlx * (r1x / r1 - r2x / r2) +
        dly * (r1y / r1 - r2y / r2) +
        dlz * (r1z / r1 - r2z / r2);
      const fac = (INV_4PI * proj) / denom;
      vx += cx * fac;
      vy += cy * fac;
      vz += cz * fac;
    }
  }

  // 2. Right semi-infinite trailing leg B -> +inf * (+Z): u_w x r2 = (-r2y, r2x, 0)
  if (r2 > EPS_TINY) {
    const perpSq = r2x * r2x + r2y * r2y + coreRadiusSq;
    const fac = (INV_4PI * (1 + r2z / r2)) / perpSq;
    vx += -r2y * fac;
    vy += r2x * fac;
  }

  // 3. Left semi-infinite trailing leg +inf * (+Z) -> A: -(u_w x r1) = (r1y, -r1x, 0)
  if (r1 > EPS_TINY) {
    const perpSq = r1x * r1x + r1y * r1y + coreRadiusSq;
    const fac = (INV_4PI * (1 + r1z / r1)) / perpSq;
    vx += r1y * fac;
    vy += -r1x * fac;
  }

  return [vx, vy, vz];
}

/**
 * Assemble the N x N normal-wash influence matrix and compute its partial-pivoting LU
 * factorization ONCE per geometry. Subsequent solves take O(N^2) (<0.5 ms).
 */
export function factorVlmMesh(mesh: VlmMesh): FactoredVlmSystem {
  const t0 = performance.now();
  const n = mesh.panels.length;
  const lu = new Float64Array(n * n);
  const piv = new Int32Array(n);
  const rcSq = R.VLM_VORTEX_CORE_RADIUS_M.value * R.VLM_VORTEX_CORE_RADIUS_M.value;

  for (let i = 0; i < n; i++) {
    const pi = mesh.panels[i]!;
    const rowOff = i * n;
    for (let j = 0; j < n; j++) {
      const pj = mesh.panels[j]!;
      const w = horseshoeVelocity(pi.collocation, pj.vortexA, pj.vortexB, rcSq);
      lu[rowOff + j] = w[0] * pi.normal[0] + w[1] * pi.normal[1] + w[2] * pi.normal[2];
    }
    piv[i] = i;
  }

  // In-place Doolittle LU factorization with partial pivoting
  for (let k = 0; k < n; k++) {
    let maxRow = k;
    let maxVal = Math.abs(lu[k * n + k]!);
    for (let i = k + 1; i < n; i++) {
      const val = Math.abs(lu[i * n + k]!);
      if (val > maxVal) {
        maxVal = val;
        maxRow = i;
      }
    }
    if (maxRow !== k) {
      const tmpP = piv[k]!;
      piv[k] = piv[maxRow]!;
      piv[maxRow] = tmpP;
      const kOff = k * n;
      const mOff = maxRow * n;
      for (let j = 0; j < n; j++) {
        const tmp = lu[kOff + j]!;
        lu[kOff + j] = lu[mOff + j]!;
        lu[mOff + j] = tmp;
      }
    }

    const diag = lu[k * n + k]!;
    if (Math.abs(diag) < EPS_TINY) continue;
    const invDiag = 1 / diag;
    for (let i = k + 1; i < n; i++) {
      const iOff = i * n;
      const factor = lu[iOff + k]! * invDiag;
      lu[iOff + k] = factor;
      const kOff = k * n;
      for (let j = k + 1; j < n; j++) {
        lu[iOff + j] = lu[iOff + j]! - factor * lu[kOff + j]!;
      }
    }
  }

  return {
    mesh,
    n,
    lu,
    piv,
    factorTimeMs: performance.now() - t0,
  };
}

function luSolve(factored: FactoredVlmSystem, rhs: Float64Array): Float64Array {
  const { n, lu, piv } = factored;
  const x = new Float64Array(n);
  // Forward substitution L y = P b
  for (let i = 0; i < n; i++) {
    let sum = rhs[piv[i]!]!;
    const iOff = i * n;
    for (let j = 0; j < i; j++) {
      sum -= lu[iOff + j]! * x[j]!;
    }
    x[i] = sum;
  }
  // Backward substitution U x = y
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i]!;
    const iOff = i * n;
    for (let j = i + 1; j < n; j++) {
      sum -= lu[iOff + j]! * x[j]!;
    }
    const diag = lu[iOff + i]!;
    x[i] = Math.abs(diag) > EPS_TINY ? sum / diag : 0;
  }
  return x;
}

function getPanelDeflectionRad(control: VlmControlId, d: VlmControlDeflections): number {
  const d2r = R.DEG_TO_RAD.value;
  switch (control) {
    case 'none':
      return 0;
    case 'lef-left':
    case 'lef-right':
      return d.lefDeg * d2r;
    case 'flaperon-left':
      return d.flaperonLeftDeg * d2r;
    case 'flaperon-right':
      return d.flaperonRightDeg * d2r;
    case 'aileron-left':
      return d.aileronLeftDeg * d2r;
    case 'aileron-right':
      return d.aileronRightDeg * d2r;
    case 'stab-left':
      return d.stabilatorLeftDeg * d2r;
    case 'stab-right':
      return d.stabilatorRightDeg * d2r;
    case 'rudder-left':
      return d.rudderLeftDeg * d2r;
    case 'rudder-right':
      return d.rudderRightDeg * d2r;
  }
}

export function freestreamUnitVector(alphaDeg: number, betaDeg: number): Vec3 {
  const a = alphaDeg * R.DEG_TO_RAD.value;
  const b = betaDeg * R.DEG_TO_RAD.value;
  return [-Math.sin(b), Math.sin(a) * Math.cos(b), Math.cos(a) * Math.cos(b)];
}

/**
 * Solve VLM right-hand side for given AoA, sideslip, Mach, and control deflections.
 * Returns valid: false without extrapolating when Mach > 0.70 (Prandtl-Glauert limit).
 */
export function solveVlm(
  factored: FactoredVlmSystem,
  input: VlmSolveInput,
  previousValid?: VlmSolveResult | null
): VlmSolveResult {
  const t0 = performance.now();
  const maxMach = R.VLM_PG_MAX_MACH.value;

  if (input.mach > maxMach) {
    if (previousValid) {
      return {
        ...previousValid,
        valid: false,
        mach: input.mach,
        validityMessage: `Outside model validity (M ${input.mach.toFixed(2)} > ${maxMach.toFixed(2)}): Prandtl–Glauert linear theory stops at M ${maxMach.toFixed(2)}; coefficients frozen.`,
      };
    }
    return {
      valid: false,
      validityMessage: `Outside model validity (M ${input.mach.toFixed(2)} > ${maxMach.toFixed(2)}): Prandtl–Glauert linear theory stops at M ${maxMach.toFixed(2)}.`,
      label: 'COMPUTED',
      mach: input.mach,
      betaPG: 1,
      alphaDeg: input.alphaDeg,
      betaDeg: input.betaDeg,
      cl: 0,
      clPotential: 0,
      clVortexIncrement: 0,
      cdi: 0,
      oswaldE: 0,
      cRoll: 0,
      cPitch: 0,
      cYaw: 0,
      panelGamma: new Float64Array(factored.n),
      panelDeltaCp: new Float64Array(factored.n),
      spanwiseWingLift: [],
      solveTimeMs: performance.now() - t0,
    };
  }

  const betaPG = Math.sqrt(Math.max(EPS_TINY, 1 - input.mach * input.mach));
  const pgScale = 1 / betaPG;
  const vInf = freestreamUnitVector(input.alphaDeg, input.betaDeg);
  const { mesh, n } = factored;

  // Build RHS: standard linear small-angle VLM normal perturbation (Katz & Plotkin Ch. 12):
  // positive TE-down deflection tilts normal aft by +delta * chordDir, increasing effective AoA linearly.
  const rhs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = mesh.panels[i]!;
    const delta = getPanelDeflectionRad(p.control, input.deflections);
    const nx = p.normal[0] + p.chordDir[0] * delta;
    const ny = p.normal[1] + p.chordDir[1] * delta;
    const nz = p.normal[2] + p.chordDir[2] * delta;
    rhs[i] = -(vInf[0] * nx + vInf[1] * ny + vInf[2] * nz);
  }

  const gammaRaw = luSolve(factored, rhs);
  const panelGamma = new Float64Array(n);
  const panelDeltaCp = new Float64Array(n);

  // Kutta-Joukowski forces & moments (with Prandtl-Glauert compressibility scaling)
  let liftTotal = 0;
  let mRoll = 0;
  let mPitch = 0;
  let mYaw = 0;

  const refC = mesh.refMomentCenter;
  const liftDir: Vec3 = [
    0,
    Math.cos(input.alphaDeg * R.DEG_TO_RAD.value),
    -Math.sin(input.alphaDeg * R.DEG_TO_RAD.value),
  ];

  for (let i = 0; i < n; i++) {
    const p = mesh.panels[i]!;
    const g = gammaRaw[i]! * pgScale;
    panelGamma[i] = g;
    panelDeltaCp[i] = p.chordM > EPS_TINY ? (2 * g) / p.chordM : 0;

    const dl: Vec3 = [
      p.vortexB[0] - p.vortexA[0],
      p.vortexB[1] - p.vortexA[1],
      p.vortexB[2] - p.vortexA[2],
    ];
    // Unit-density Kutta-Joukowski force: F = (V_inf x dl) * Gamma
    const f = cross3(vInf, dl);
    const fx = f[0] * g;
    const fy = f[1] * g;
    const fz = f[2] * g;

    liftTotal += fx * liftDir[0] + fy * liftDir[1] + fz * liftDir[2];

    const mx = (p.vortexA[0] + p.vortexB[0]) / 2 - refC[0];
    const my = (p.vortexA[1] + p.vortexB[1]) / 2 - refC[1];
    const mz = (p.vortexA[2] + p.vortexB[2]) / 2 - refC[2];

    // Aerospace sign conventions:
    // +Roll (C_l): right-wing-down (lift on -X left wing creates +roll; lift on +X right wing creates -roll)
    mRoll += -mx * fy + my * fx;
    // +Pitch (C_m): nose-up (lift forward of CG mz < 0 creates +pitch; lift aft mz > 0 creates -pitch)
    mPitch += -mz * fy + my * fz;
    // +Yaw (C_n): nose-right (side force +fx forward creates +yaw, aft creates -yaw)
    mYaw += -mz * fx + mx * fz;
  }

  const qS = mesh.refAreaM2 / 2; // dynamic pressure q = 0.5 * rho * V^2 with rho = 1, V = 1
  const clPotential = liftTotal / qS;

  // Optional Polhamus leading-edge suction analogy (NASA TN D-3767, 1966)
  const alphaRad = input.alphaDeg * R.DEG_TO_RAD.value;
  const clVortexIncrement = input.polhamusVortexLift
    ? R.VLM_POLHAMUS_KV_APPROX.value *
      Math.sign(alphaRad) *
      Math.cos(alphaRad) *
      Math.sin(alphaRad) *
      Math.sin(alphaRad)
    : 0;
  const cl = clPotential + clVortexIncrement;

  // Exact Trefftz-plane far-field induced drag (Katz & Plotkin, 2nd ed., §12.5)
  const nStrips = mesh.strips.length;
  const stripGamma = new Float64Array(nStrips);
  for (let s = 0; s < nStrips; s++) {
    const st = mesh.strips[s]!;
    let sumG = 0;
    for (const pidx of st.panelIndices) {
      sumG += panelGamma[pidx]!;
    }
    stripGamma[s] = sumG;
  }

  const rcSq = R.VLM_VORTEX_CORE_RADIUS_M.value * R.VLM_VORTEX_CORE_RADIUS_M.value;
  let dragInduced = 0;
  const spanwiseWingLift: SpanwiseLiftPoint[] = [];

  for (let i = 0; i < nStrips; i++) {
    const si = mesh.strips[i]!;
    const px = (si.vortexA[0] + si.vortexB[0]) / 2;
    const py = (si.vortexA[1] + si.vortexB[1]) / 2;

    let wx = 0;
    let wy = 0;
    for (let j = 0; j < nStrips; j++) {
      const sj = mesh.strips[j]!;
      const gj = stripGamma[j]!;
      if (Math.abs(gj) < EPS_TINY) continue;

      // Trailing leg B (+Z): (u_w x rB) = (-rBy, rBx)
      const rBx = px - sj.vortexB[0];
      const rBy = py - sj.vortexB[1];
      const fB = (INV_2PI * gj) / (rBx * rBx + rBy * rBy + rcSq);
      wx += -rBy * fB;
      wy += rBx * fB;

      // Trailing leg A (-Z): -(u_w x rA) = (rAy, -rAx)
      const rAx = px - sj.vortexA[0];
      const rAy = py - sj.vortexA[1];
      const fA = (INV_2PI * gj) / (rAx * rAx + rAy * rAy + rcSq);
      wx += rAy * fA;
      wy += -rAx * fA;
    }

    const wNormal = wx * si.normal[0] + wy * si.normal[1];
    // Trefftz-plane: D_i = -0.5 * sum(Gamma_i * w_n,i * ds_i)
    dragInduced += (-1 / 2) * stripGamma[i]! * wNormal * si.widthM;

    if (si.surface === 'wing-left' || si.surface === 'wing-right') {
      const clLocal = si.chordM > EPS_TINY ? (2 * stripGamma[i]!) / si.chordM : 0;
      spanwiseWingLift.push({
        xSpanM: si.ySpanM,
        yElevM: si.yElevM,
        zMidM: si.zMidM,
        chordM: si.chordM,
        cl: clLocal,
        cClOverCref: (si.chordM * clLocal) / Math.max(EPS_TINY, mesh.refMacM),
      });
    }
  }

  spanwiseWingLift.sort((a, b) => a.xSpanM - b.xSpanM);

  const cdi = Math.max(0, dragInduced / qS);
  const ar = (mesh.refSpanM * mesh.refSpanM) / mesh.refAreaM2;
  const oswaldE =
    cdi > EPS_TINY && Math.abs(clPotential) > 1e-4
      ? (clPotential * clPotential) / (Math.PI * ar * cdi)
      : 0;

  return {
    valid: true,
    validityMessage: null,
    label: 'COMPUTED',
    mach: input.mach,
    betaPG,
    alphaDeg: input.alphaDeg,
    betaDeg: input.betaDeg,
    cl,
    clPotential,
    clVortexIncrement,
    cdi,
    oswaldE,
    cRoll: mRoll / (qS * mesh.refSpanM),
    cPitch: mPitch / (qS * mesh.refMacM),
    cYaw: mYaw / (qS * mesh.refSpanM),
    panelGamma,
    panelDeltaCp,
    spanwiseWingLift,
    solveTimeMs: performance.now() - t0,
  };
}

/**
 * Evaluate Biot-Savart induced velocity + freestream at an arbitrary 3D point
 * for streamline / wingtip-vortex particle advection.
 */
export function evaluateVlmVelocity(
  mesh: VlmMesh,
  panelGamma: Float64Array,
  alphaDeg: number,
  betaDeg: number,
  point: Vec3
): [number, number, number] {
  const vInf = freestreamUnitVector(alphaDeg, betaDeg);
  let vx = vInf[0];
  let vy = vInf[1];
  let vz = vInf[2];

  const rc = R.VLM_STREAMLINE_CORE_RADIUS_M.value;
  const rcSq = rc * rc;
  const panels = mesh.panels;

  for (let j = 0; j < panels.length; j++) {
    const g = panelGamma[j]!;
    if (Math.abs(g) < 1e-5) continue;
    const pj = panels[j]!;
    const w = horseshoeVelocity(point, pj.vortexA, pj.vortexB, rcSq);
    vx += w[0] * g;
    vy += w[1] * g;
    vz += w[2] * g;
  }

  return [vx, vy, vz];
}
