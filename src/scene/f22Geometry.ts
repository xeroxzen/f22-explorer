/**
 * Pure TypeScript procedural lofted F-22 Raptor geometry & exact SAT collision engine.
 * Zero Three.js imports so Vitest (Node) and R3F (browser) share the EXACT same vertices.
 *
 * Coordinate system (meters, right-handed):
 *   +X = Starboard (right), Wingspan = 13.56 m (-6.78 .. +6.78)
 *   +Y = Up, Ground plane = 0.00 m, Vertical tail tip = 5.08 m
 *   +Z = Aft, FS 0.00 (nose tip) = -9.46 m, FS 18.92 (tail boom tip) = +9.46 m
 */

import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';

export type Vec3Tuple = readonly [number, number, number];

export type SystemGroup =
  | 'airframe'
  | 'cockpit'
  | 'intakes-fuel'
  | 'weapons'
  | 'wings'
  | 'empennage'
  | 'propulsion'
  | 'gear';

export type MaterialRole =
  | 'stealth-skin'
  | 'stealth-dark'
  | 'canopy-gold'
  | 'titanium'
  | 'engine-core'
  | 'nozzle-ceramic'
  | 'bay-white'
  | 'ordnance-body'
  | 'gear-strut'
  | 'cockpit-dark';

export interface ConvexHull {
  readonly vertices: readonly Vec3Tuple[];
  readonly normals: readonly Vec3Tuple[];
}

export interface BuiltPartMesh {
  readonly id: string;
  readonly systemGroup: SystemGroup;
  readonly material: MaterialRole;
  readonly isOuterSkin: boolean;
  /** World-space anchor point [x, y, z] in assembled state (for leader labels & bounds). */
  readonly anchor: Vec3Tuple;
  /** Directional explode displacement [dx, dy, dz] in meters at explode = 1. */
  readonly explode: Vec3Tuple;
  /** Triangle vertex positions in world space (assembled state, length = 9 * numTris). */
  readonly positions: Float32Array;
  /** Convex sub-hulls for exact 3D Separating Axis Theorem (SAT) collision checks. */
  readonly hulls: readonly ConvexHull[];
}

export const SYSTEM_GROUP_COLORS: Record<SystemGroup, { label: string; tint: string }> = {
  airframe: { label: 'Airframe', tint: '#94a3b8' },
  cockpit: { label: 'Cockpit', tint: '#f59e0b' },
  'intakes-fuel': { label: 'Intakes / Fuel / APU', tint: '#14b8a6' },
  weapons: { label: 'Weapons & Gun', tint: '#f43f5e' },
  wings: { label: 'Wings & Surfaces', tint: '#38bdf8' },
  empennage: { label: 'Empennage', tint: '#818cf8' },
  propulsion: { label: 'Propulsion (F119)', tint: '#fb923c' },
  gear: { label: 'Landing Gear', tint: '#cbd5e1' },
};

const HALF_LEN = R.F22_LENGTH_M.value / 2; // 9.46 m
const DEG = Math.PI / 180;
const TAN_LE = Math.tan(R.F22_WING_LE_SWEEP_DEG.value * DEG); // tan(42°) = 0.900404
const TAN_TE = Math.tan(-R.F22_WING_TE_SWEEP_DEG.value * DEG); // tan(17°) = 0.305731

export function fsToZ(fs: number): number {
  return fs - HALF_LEN;
}

// Wing planform equations (exact 78.13 m² trapezoidal area, 13.56 m span)
const WING_CL_LE_FS = 4.92;
const WING_CL_TE_FS = WING_CL_LE_FS + R.F22_WING_ROOT_CHORD_CL_M.value; // 14.77 m

export function wingLeFs(absX: number): number {
  return WING_CL_LE_FS + absX * TAN_LE;
}

export function wingTeFs(absX: number): number {
  return WING_CL_TE_FS - absX * TAN_TE;
}

function sub(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: Vec3Tuple): Vec3Tuple {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 1e-9 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 1, 0];
}

function pushQuad(
  out: number[],
  a: Vec3Tuple,
  b: Vec3Tuple,
  c: Vec3Tuple,
  d: Vec3Tuple
): void {
  out.push(
    a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2],
    a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]
  );
}

function makeHexahedron(verts: readonly Vec3Tuple[]): {
  tris: number[];
  hull: ConvexHull;
} {
  // verts: 0..3 bottom/inner quad (CCW), 4..7 top/outer quad (CCW)
  const tris: number[] = [];
  const faces: [number, number, number, number][] = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
  ];
  const normals: Vec3Tuple[] = [];
  for (const [i0, i1, i2, i3] of faces) {
    const a = verts[i0]!;
    const b = verts[i1]!;
    const c = verts[i2]!;
    const d = verts[i3]!;
    pushQuad(tris, a, b, c, d);
    const n = normalize(cross(sub(b, a), sub(c, a)));
    if (Math.hypot(n[0], n[1], n[2]) > 0.5) normals.push(n);
  }
  return { tris, hull: { vertices: verts, normals } };
}

function makeBox(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number
): { tris: number[]; hull: ConvexHull } {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const v: Vec3Tuple[] = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz + hz],
    [cx - hx, cy - hy, cz + hz],
    [cx - hx, cy + hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ];
  return makeHexahedron(v);
}

/**
 * Loft a closed chined 6-point stealth fuselage segment across multiple stations.
 * Each station specifies [fs, halfWidth, yTop, yChine, yBottom, topWidthFrac, botWidthFrac].
 */
interface ChineStation {
  readonly fs: number;
  readonly hw: number;
  readonly yTop: number;
  readonly yChine: number;
  readonly yBot: number;
  readonly topFrac?: number;
  readonly botFrac?: number;
}

function stationRing(s: ChineStation): Vec3Tuple[] {
  const z = fsToZ(s.fs);
  const tf = s.topFrac ?? 0.52;
  const bf = s.botFrac ?? 0.68;
  return [
    [-s.hw * tf, s.yTop, z],
    [s.hw * tf, s.yTop, z],
    [s.hw, s.yChine, z],
    [s.hw * bf, s.yBot, z],
    [-s.hw * bf, s.yBot, z],
    [-s.hw, s.yChine, z],
  ];
}

function buildChinedLoft(stations: readonly ChineStation[]): {
  tris: number[];
  hulls: ConvexHull[];
} {
  const tris: number[] = [];
  const hulls: ConvexHull[] = [];
  const rings = stations.map(stationRing);

  for (let k = 0; k < rings.length - 1; k++) {
    const r0 = rings[k]!;
    const r1 = rings[k + 1]!;
    const segVerts = [...r0, ...r1];
    const segNormals: Vec3Tuple[] = [
      [0, 0, -1],
      [0, 0, 1],
    ];
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      pushQuad(tris, r0[i]!, r1[i]!, r1[j]!, r0[j]!);
      segNormals.push(normalize(cross(sub(r1[i]!, r0[i]!), sub(r1[j]!, r0[i]!))));
    }
    hulls.push({ vertices: segVerts, normals: segNormals });
  }

  // Front cap
  const first = rings[0]!;
  const fc: Vec3Tuple = [
    0,
    (stations[0]!.yTop + stations[0]!.yBot) / 2,
    fsToZ(stations[0]!.fs),
  ];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    tris.push(
      fc[0], fc[1], fc[2],
      first[j]![0], first[j]![1], first[j]![2],
      first[i]![0], first[i]![1], first[i]![2]
    );
  }
  // Rear cap
  const last = rings[rings.length - 1]!;
  const rc: Vec3Tuple = [
    0,
    (stations[stations.length - 1]!.yTop + stations[stations.length - 1]!.yBot) / 2,
    fsToZ(stations[stations.length - 1]!.fs),
  ];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    tris.push(
      rc[0], rc[1], rc[2],
      last[i]![0], last[i]![1], last[i]![2],
      last[j]![0], last[j]![1], last[j]![2]
    );
  }

  return { tris, hulls };
}

/**
 * Build a tapered swept airfoil/control-surface hexahedron between xIn and xOut.
 */
function buildSweptPanel(
  side: -1 | 1,
  xIn: number,
  xOut: number,
  fsInLe: number,
  fsInTe: number,
  fsOutLe: number,
  fsOutTe: number,
  yCenterIn: number,
  yCenterOut: number,
  thickIn: number,
  thickOut: number
): { tris: number[]; hull: ConvexHull } {
  const xi = side * xIn;
  const xo = side * xOut;
  const hti = thickIn / 2;
  const hto = thickOut / 2;

  const v: Vec3Tuple[] =
    side === 1
      ? [
          [xi, yCenterIn - hti, fsToZ(fsInLe)],
          [xo, yCenterOut - hto, fsToZ(fsOutLe)],
          [xo, yCenterOut - hto, fsToZ(fsOutTe)],
          [xi, yCenterIn - hti, fsToZ(fsInTe)],
          [xi, yCenterIn + hti, fsToZ(fsInLe)],
          [xo, yCenterOut + hto, fsToZ(fsOutLe)],
          [xo, yCenterOut + hto, fsToZ(fsOutTe)],
          [xi, yCenterIn + hti, fsToZ(fsInTe)],
        ]
      : [
          [xo, yCenterOut - hto, fsToZ(fsOutLe)],
          [xi, yCenterIn - hti, fsToZ(fsInLe)],
          [xi, yCenterIn - hti, fsToZ(fsInTe)],
          [xo, yCenterOut - hto, fsToZ(fsOutTe)],
          [xo, yCenterOut + hto, fsToZ(fsOutLe)],
          [xi, yCenterIn + hti, fsToZ(fsInLe)],
          [xi, yCenterIn + hti, fsToZ(fsInTe)],
          [xo, yCenterOut + hto, fsToZ(fsOutTe)],
        ];

  return makeHexahedron(v);
}

/**
 * Build an outward-canted (28°) vertical stabilizer or rudder tapered airfoil prism.
 */
function buildCantedVerticalPanel(
  side: -1 | 1,
  xRoot: number,
  yRoot: number,
  xTip: number,
  yTip: number,
  fsRootLe: number,
  fsRootTe: number,
  fsTipLe: number,
  fsTipTe: number,
  thickRoot: number,
  thickTip: number
): { tris: number[]; hull: ConvexHull } {
  const xr = side * xRoot;
  const xt = side * xTip;
  const htr = thickRoot / 2;
  const htt = thickTip / 2;

  const v: Vec3Tuple[] = [
    [xr - htr, yRoot, fsToZ(fsRootLe)],
    [xr + htr, yRoot, fsToZ(fsRootLe)],
    [xr + htr, yRoot, fsToZ(fsRootTe)],
    [xr - htr, yRoot, fsToZ(fsRootTe)],
    [xt - htt, yTip, fsToZ(fsTipLe)],
    [xt + htt, yTip, fsToZ(fsTipLe)],
    [xt + htt, yTip, fsToZ(fsTipTe)],
    [xt - htt, yTip, fsToZ(fsTipTe)],
  ];
  return makeHexahedron(v);
}

/**
 * Build an approximate octagonal cylinder along Z (for F119 engine cores & missiles).
 */
function buildCylinderZ(
  cx: number,
  cy: number,
  zStart: number,
  zEnd: number,
  rFront: number,
  rRear: number,
  segs = 12
): { tris: number[]; hull: ConvexHull } {
  const tris: number[] = [];
  const fRing: Vec3Tuple[] = [];
  const rRing: Vec3Tuple[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    fRing.push([cx + ca * rFront, cy + sa * rFront, zStart]);
    rRing.push([cx + ca * rRear, cy + sa * rRear, zEnd]);
  }
  const normals: Vec3Tuple[] = [
    [0, 0, -1],
    [0, 0, 1],
  ];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    pushQuad(tris, fRing[i]!, rRing[i]!, rRing[j]!, fRing[j]!);
    normals.push(normalize(cross(sub(rRing[i]!, fRing[i]!), sub(rRing[j]!, fRing[i]!))));
    tris.push(cx, cy, zStart, fRing[j]![0], fRing[j]![1], fRing[j]![2], fRing[i]![0], fRing[i]![1], fRing[i]![2]);
    tris.push(cx, cy, zEnd, rRing[i]![0], rRing[i]![1], rRing[i]![2], rRing[j]![0], rRing[j]![1], rRing[j]![2]);
  }
  return { tris, hull: { vertices: [...fRing, ...rRing], normals } };
}

/**
 * Build an octagonal wheel/cylinder along X (for realistic landing gear tires).
 */
function buildCylinderX(
  xStart: number,
  xEnd: number,
  cy: number,
  cz: number,
  radius: number,
  segs = 12
): { tris: number[]; hull: ConvexHull } {
  const tris: number[] = [];
  const lRing: Vec3Tuple[] = [];
  const rRing: Vec3Tuple[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    lRing.push([xStart, cy + ca * radius, cz + sa * radius]);
    rRing.push([xEnd, cy + ca * radius, cz + sa * radius]);
  }
  const normals: Vec3Tuple[] = [
    [-1, 0, 0],
    [1, 0, 0],
  ];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    pushQuad(tris, lRing[i]!, rRing[i]!, rRing[j]!, lRing[j]!);
    normals.push(normalize(cross(sub(rRing[i]!, lRing[i]!), sub(rRing[j]!, lRing[i]!))));
    tris.push(xStart, cy, cz, lRing[j]![0], lRing[j]![1], lRing[j]![2], lRing[i]![0], lRing[i]![1], lRing[i]![2]);
    tris.push(xEnd, cy, cz, rRing[i]![0], rRing[i]![1], rRing[i]![2], rRing[j]![0], rRing[j]![1], rRing[j]![2]);
  }
  return { tris, hull: { vertices: [...lRing, ...rRing], normals } };
}

/**
 * Build a vertical cylindrical strut along Y (for landing gear oleo struts).
 */
function buildCylinderY(
  cx: number,
  cz: number,
  yBot: number,
  yTop: number,
  radius: number,
  segs = 10
): { tris: number[]; hull: ConvexHull } {
  const tris: number[] = [];
  const bRing: Vec3Tuple[] = [];
  const tRing: Vec3Tuple[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    bRing.push([cx + ca * radius, yBot, cz + sa * radius]);
    tRing.push([cx + ca * radius, yTop, cz + sa * radius]);
  }
  const normals: Vec3Tuple[] = [
    [0, -1, 0],
    [0, 1, 0],
  ];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    pushQuad(tris, bRing[i]!, bRing[j]!, tRing[j]!, tRing[i]!);
    normals.push(normalize(cross(sub(bRing[j]!, bRing[i]!), sub(tRing[i]!, bRing[i]!))));
  }
  return { tris, hull: { vertices: [...bRing, ...tRing], normals } };
}

/**
 * Build a multi-station lofted long, low-profile teardrop bubble canopy seated flush on the spine.
 */
function buildBubbleCanopy(fsStart: number, fsEnd: number, yBase: number, maxH: number, maxHW: number): {
  tris: number[];
  hulls: ConvexHull[];
} {
  const stations: ChineStation[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const fs = fsStart + t * (fsEnd - fsStart);
    const arch = Math.sin(Math.PI * Math.pow(t, 0.78));
    const hw = Math.max(0.05, maxHW * Math.pow(arch, 0.65));
    const h = Math.max(0.03, maxH * arch);
    stations.push({
      fs,
      hw,
      yTop: yBase + h,
      yChine: yBase + h * 0.42,
      yBot: yBase,
      topFrac: 0.44,
      botFrac: 0.98,
    });
  }
  return buildChinedLoft(stations);
}

function computeAnchor(positions: Float32Array): Vec3Tuple {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!, y = positions[i + 1]!, z = positions[i + 2]!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
}

function makePart(
  id: string,
  systemGroup: SystemGroup,
  material: MaterialRole,
  isOuterSkin: boolean,
  explode: Vec3Tuple,
  tris: number[],
  hulls: ConvexHull[]
): BuiltPartMesh {
  const positions = new Float32Array(tris);
  return {
    id,
    systemGroup,
    material,
    isOuterSkin,
    anchor: computeAnchor(positions),
    explode,
    positions,
    hulls,
  };
}

/**
 * Build all 44 lofted/tapered physical F-22 parts once (cached singleton).
 */
export function buildAllF22Parts(): readonly BuiltPartMesh[] {
  const parts: BuiltPartMesh[] = [];

  // =========================================================================
  // 1. FORWARD FUSELAGE & COCKPIT (FS 0.00 -> 6.40, deep chined sides + flush canopy)
  // =========================================================================
  {
    const rad = buildChinedLoft([
      { fs: 0.0, hw: 0.06, yTop: 1.74, yChine: 1.70, yBot: 1.66 },
      { fs: 0.65, hw: 0.46, yTop: 1.98, yChine: 1.74, yBot: 1.44 },
      { fs: 1.45, hw: 0.74, yTop: 2.16, yChine: 1.76, yBot: 1.32 },
      { fs: 2.22, hw: 0.91, yTop: 2.27, yChine: 1.78, yBot: 1.26 },
    ]);
    parts.push(makePart('radome', 'airframe', 'stealth-dark', true, [0, 0, -5.6], rad.tris, rad.hulls));
  }

  {
    // AN/APG-77 AESA radar array seated cleanly between radome (FS 2.22) and nose-avionics-bay (FS 2.30)
    const radar = buildCylinderZ(0, 1.76, fsToZ(2.235), fsToZ(2.285), 0.36, 0.36, 12);
    parts.push(makePart('an-apg-77-radar', 'airframe', 'titanium', false, [0, 0, -4.6], radar.tris, [radar.hull]));
  }

  {
    const av = buildChinedLoft([
      { fs: 2.30, hw: 0.93, yTop: 2.28, yChine: 1.78, yBot: 1.26 },
      { fs: 3.36, hw: 1.16, yTop: 2.48, yChine: 1.82, yBot: 1.24 },
    ]);
    parts.push(makePart('nose-avionics-bay', 'airframe', 'stealth-skin', true, [0, 0, -3.8], av.tris, av.hulls));
  }

  {
    // Air data / pitot-static probes flanking the forward nose chine
    const pL = makeBox(-1.18, 1.78, fsToZ(3.16), 0.04, 0.04, 0.24);
    const pR = makeBox(1.18, 1.78, fsToZ(3.16), 0.04, 0.04, 0.24);
    parts.push(
      makePart(
        'pitot-air-data-probes',
        'airframe',
        'titanium',
        false,
        [0, -0.2, -4.1],
        [...pL.tris, ...pR.tris],
        [pL.hull, pR.hull]
      )
    );
  }

  {
    // Forward fuselage: deep lower hull + left & right sculpted cheek walls up to canopy sill (Y = 2.52)
    const belly = buildChinedLoft([
      { fs: 3.40, hw: 1.17, yTop: 1.98, yChine: 1.78, yBot: 1.24, topFrac: 0.90, botFrac: 0.72 },
      { fs: 4.90, hw: 1.36, yTop: 1.98, yChine: 1.80, yBot: 1.24, topFrac: 0.92, botFrac: 0.76 },
      { fs: 6.38, hw: 1.36, yTop: 1.98, yChine: 1.82, yBot: 1.24, topFrac: 0.92, botFrac: 0.76 },
    ]);
    const cheekL = buildSweptPanel(-1, 0.62, 1.34, 3.40, 6.38, 3.40, 6.38, 2.26, 2.26, 0.50, 0.46);
    const cheekR = buildSweptPanel(1, 0.62, 1.34, 3.40, 6.38, 3.40, 6.38, 2.26, 2.26, 0.50, 0.46);
    parts.push(
      makePart(
        'forward-fuselage',
        'airframe',
        'stealth-skin',
        true,
        [0, -0.4, -2.0],
        [...belly.tris, ...cheekL.tris, ...cheekR.tris],
        [...belly.hulls, cheekL.hull, cheekR.hull]
      )
    );
  }

  {
    // Cockpit tub recessed cleanly inside forward fuselage cheeks (|X| <= 0.58)
    const tub = makeBox(0, 2.11, fsToZ(4.85), 1.12, 0.20, 2.74);
    parts.push(makePart('cockpit-tub', 'cockpit', 'cockpit-dark', false, [0, 1.1, -2.0], tub.tris, [tub.hull]));
  }
  {
    const disp = makeBox(0, 2.38, fsToZ(3.86), 0.76, 0.26, 0.54);
    parts.push(makePart('cockpit-displays-hud', 'cockpit', 'cockpit-dark', false, [0, 1.9, -2.4], disp.tris, [disp.hull]));
  }
  {
    const hotas = makeBox(0, 2.34, fsToZ(4.48), 0.84, 0.18, 0.46);
    parts.push(makePart('hotas-controls', 'cockpit', 'cockpit-dark', false, [0, 1.7, -2.0], hotas.tris, [hotas.hull]));
  }
  {
    const seat = makeBox(0, 2.39, fsToZ(5.18), 0.56, 0.30, 0.70);
    parts.push(makePart('aces-ii-seat', 'cockpit', 'cockpit-dark', false, [0, 2.3, -1.9], seat.tris, [seat.hull]));
  }
  {
    const act = makeBox(0, 2.36, fsToZ(5.94), 0.18, 0.16, 0.44);
    parts.push(makePart('canopy-actuator', 'cockpit', 'titanium', false, [0, 2.9, -1.8], act.tris, [act.hull]));
  }
  {
    // Long low-profile bubble canopy seated FLUSH on the fuselage spine (Y = 2.55 -> 3.30)
    const can = buildBubbleCanopy(3.22, 6.39, 2.55, 0.74, 0.60);
    parts.push(makePart('canopy', 'cockpit', 'canopy-gold', true, [0, 3.6, -1.8], can.tris, can.hulls));
  }
  {
    // Conformal dorsal IFF & CNI antenna apertures just aft of canopy
    const iff = makeBox(0, 2.78, fsToZ(6.70), 0.36, 0.06, 0.44);
    parts.push(makePart('iff-comm-antennas', 'airframe', 'stealth-dark', false, [0, 3.2, -0.6], iff.tris, [iff.hull]));
  }

  // =========================================================================
  // 2. CENTER FUSELAGE, CARET INTAKES (FLANKING COCKPIT), FUEL & APU
  // =========================================================================
  {
    const ctr = buildChinedLoft([
      { fs: 6.42, hw: 1.34, yTop: 2.68, yChine: 2.48, yBot: 2.30, topFrac: 0.58, botFrac: 0.94 },
      { fs: 8.50, hw: 1.36, yTop: 2.72, yChine: 2.50, yBot: 2.30, topFrac: 0.60, botFrac: 0.94 },
      { fs: 10.50, hw: 1.36, yTop: 2.68, yChine: 2.48, yBot: 2.30, topFrac: 0.60, botFrac: 0.94 },
      { fs: 12.56, hw: 1.44, yTop: 2.64, yChine: 2.46, yBot: 2.30, topFrac: 0.66, botFrac: 0.94 },
    ]);
    parts.push(makePart('center-fuselage', 'airframe', 'stealth-skin', true, [0, 1.8, 0], ctr.tris, ctr.hulls));
  }

  // Left & Right Caret Air Intakes extending forward to FS 5.45 flanking the aft cockpit!
  for (const side of [-1, 1] as const) {
    const id = side === -1 ? 'intake-left' : 'intake-right';
    const intake = buildSweptPanel(
      side,
      1.39,
      1.84,
      5.45,
      12.56,
      6.05,
      12.56,
      1.96,
      1.96,
      0.74,
      0.56
    );
    parts.push(
      makePart(
        id,
        'intakes-fuel',
        'stealth-skin',
        true,
        [side * 2.2, 0.2, -0.3],
        intake.tris,
        [intake.hull]
      )
    );
  }

  {
    // Central fuel manifold + 4 individual fuel cells (forward, aft, left/right wing)
    const fuel = makeBox(0, 2.20, fsToZ(9.55), 1.80, 0.10, 4.80);
    parts.push(makePart('internal-fuel-tanks', 'intakes-fuel', 'titanium', false, [0, 0.9, 0], fuel.tris, [fuel.hull]));

    const fFwd = makeBox(0, 2.00, fsToZ(8.15), 2.10, 0.22, 2.20);
    parts.push(makePart('fuel-tank-forward', 'intakes-fuel', 'titanium', false, [0, 0.4, -0.8], fFwd.tris, [fFwd.hull]));

    const fAft = makeBox(0, 2.00, fsToZ(10.95), 2.10, 0.22, 2.20);
    parts.push(makePart('fuel-tank-aft', 'intakes-fuel', 'titanium', false, [0, 0.4, 0.8], fAft.tris, [fAft.hull]));

    for (const side of [-1, 1] as const) {
      const lr = side === -1 ? 'left' : 'right';
      const fWing = makeBox(side * 2.55, 1.74, fsToZ(11.10), 1.10, 0.04, 0.90);
      parts.push(makePart(`fuel-tank-wing-${lr}`, 'intakes-fuel', 'titanium', false, [side * 3.2, -0.6, 0], fWing.tris, [fWing.hull]));
    }
  }
  {
    const refuel = makeBox(0, 2.81, fsToZ(9.00), 0.44, 0.04, 1.12);
    parts.push(makePart('refueling-receptacle', 'intakes-fuel', 'stealth-dark', true, [0, 3.0, 0], refuel.tris, [refuel.hull]));
  }
  {
    const apu = makeBox(0, 2.80, fsToZ(11.45), 0.52, 0.06, 1.24);
    parts.push(makePart('apu-bay', 'intakes-fuel', 'stealth-dark', false, [0, 3.0, 0.9], apu.tris, [apu.hull]));
  }

  // =========================================================================
  // 3. INTERNAL WEAPONS BAYS & INTERNAL M61A2 CANNON
  // =========================================================================
  {
    const bay = makeBox(0, 1.76, fsToZ(9.25), 2.10, 0.16, 4.30);
    parts.push(makePart('main-weapons-bay', 'weapons', 'bay-white', false, [0, -1.5, 0], bay.tris, [bay.hull]));
  }
  {
    // 6 × AIM-120 educational schematic shapes
    const ordTris: number[] = [];
    const ordHulls: ConvexHull[] = [];
    for (const ox of [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75]) {
      const m = buildCylinderZ(ox, 1.48, fsToZ(7.42), fsToZ(11.08), 0.08, 0.08, 10);
      ordTris.push(...m.tris);
      ordHulls.push(m.hull);
    }
    parts.push(makePart('internal-ordnance-display', 'weapons', 'ordnance-body', false, [0, -2.5, 0], ordTris, ordHulls));
  }
  {
    const doors = makeBox(0, 1.23, fsToZ(9.25), 2.12, 0.08, 4.30);
    parts.push(makePart('main-bay-doors', 'weapons', 'stealth-skin', true, [0, -3.4, 0], doors.tris, [doors.hull]));
  }
  for (const side of [-1, 1] as const) {
    const id = side === -1 ? 'side-weapons-bay-left' : 'side-weapons-bay-right';
    const sb = makeBox(side * 1.42, 1.40, fsToZ(8.90), 0.44, 0.32, 3.40);
    parts.push(makePart(id, 'weapons', 'bay-white', false, [side * 2.8, -0.9, 0], sb.tris, [sb.hull]));
  }
  {
    const lDoor = makeBox(-1.72, 1.40, fsToZ(8.90), 0.06, 0.32, 3.40);
    const rDoor = makeBox(1.72, 1.40, fsToZ(8.90), 0.06, 0.32, 3.40);
    parts.push(
      makePart(
        'side-bay-doors',
        'weapons',
        'stealth-skin',
        true,
        [0, -1.6, 0],
        [...lDoor.tris, ...rDoor.tris],
        [lDoor.hull, rDoor.hull]
      )
    );
  }
  {
    // Internal M61A2 cannon tucked inside right dorsal wing-root shoulder (flush dark port)
    const gun = makeBox(1.56, 2.40, fsToZ(8.95), 0.16, 0.06, 2.10);
    parts.push(makePart('m61a2-cannon', 'weapons', 'stealth-dark', false, [2.0, 1.6, -0.2], gun.tris, [gun.hull]));

    const gunDoor = makeBox(1.56, 2.50, fsToZ(7.66), 0.18, 0.04, 0.32);
    parts.push(makePart('gun-port-door', 'weapons', 'stealth-skin', false, [2.2, 2.0, -0.4], gunDoor.tris, [gunDoor.hull]));
  }

  // =========================================================================
  // 4. CLIPPED-DIAMOND WINGS & FLUSH SWEPT CONTROL SURFACES (Span = 13.56 m)
  // =========================================================================
  const LEF_CHORD = 0.56;
  const teCut = (absX: number): number =>
    0.92 - ((absX - 1.85) / (6.78 - 1.85)) * (0.92 - 0.34);
  const GAP = 0.04;

  for (const side of [-1, 1] as const) {
    const lr = side === -1 ? 'left' : 'right';

    // Main Wing Box (|X| = 1.85 -> 6.78 m, exact 42° LE & -17° TE clipped diamond)
    const w = buildSweptPanel(
      side,
      1.85,
      6.78,
      wingLeFs(1.85) + LEF_CHORD + GAP,
      wingTeFs(1.85) - teCut(1.85) - GAP,
      wingLeFs(6.78) + LEF_CHORD * 0.45 + GAP,
      wingTeFs(6.78) - teCut(6.78) - GAP,
      1.96,
      1.84,
      0.32,
      0.07
    );
    parts.push(makePart(`wing-${lr}`, 'wings', 'stealth-skin', true, [side * 3.0, 0, 0], w.tris, [w.hull]));

    // Leading-Edge Flap (flush along exact 42° LE!)
    const lef = buildSweptPanel(
      side,
      1.96,
      6.64,
      wingLeFs(1.96),
      wingLeFs(1.96) + LEF_CHORD,
      wingLeFs(6.64),
      wingLeFs(6.64) + LEF_CHORD * 0.45,
      1.96,
      1.84,
      0.16,
      0.06
    );
    parts.push(makePart(`lef-${lr}`, 'wings', 'stealth-dark', true, [side * 3.8, 0, -1.0], lef.tris, [lef.hull]));

    // Inboard Flaperon (flush along exact -17° TE!)
    const flp = buildSweptPanel(
      side,
      1.96,
      4.34,
      wingTeFs(1.96) - teCut(1.96),
      wingTeFs(1.96),
      wingTeFs(4.34) - teCut(4.34),
      wingTeFs(4.34),
      1.95,
      1.90,
      0.16,
      0.11
    );
    parts.push(makePart(`flaperon-${lr}`, 'wings', 'stealth-dark', true, [side * 3.6, 0, 1.0], flp.tris, [flp.hull]));

    // Outboard Aileron (flush along exact -17° TE!)
    const ail = buildSweptPanel(
      side,
      4.42,
      6.64,
      wingTeFs(4.42) - teCut(4.42),
      wingTeFs(4.42),
      wingTeFs(6.64) - teCut(6.64),
      wingTeFs(6.64),
      1.90,
      1.84,
      0.11,
      0.06
    );
    parts.push(makePart(`aileron-${lr}`, 'wings', 'stealth-dark', true, [side * 4.2, 0, 1.0], ail.tris, [ail.hull]));
  }

  // =========================================================================
  // 5. AFT FUSELAGE, EMPENNAGE (28° CANT) & TWIN F119 PROPULSION
  // =========================================================================
  {
    const aft = buildChinedLoft([
      { fs: 12.60, hw: 1.32, yTop: 2.64, yChine: 2.46, yBot: 2.30, topFrac: 0.72, botFrac: 0.94 },
      { fs: 14.80, hw: 1.32, yTop: 2.58, yChine: 2.44, yBot: 2.30, topFrac: 0.72, botFrac: 0.94 },
      { fs: 16.86, hw: 1.30, yTop: 2.48, yChine: 2.38, yBot: 2.30, topFrac: 0.68, botFrac: 0.92 },
    ]);
    parts.push(makePart('aft-fuselage', 'airframe', 'stealth-skin', true, [0, 1.4, 2.2], aft.tris, aft.hulls));
  }

  for (const side of [-1, 1] as const) {
    const lr = side === -1 ? 'left' : 'right';
    const xEng = side * 0.72;

    // Outer F119 engine nacelle casing shroud (above the 7 sequential cutaway stages)
    const engCasing = makeBox(xEng, 2.24, fsToZ(14.74), 0.96, 0.08, 4.16);
    parts.push(
      makePart(
        `engine-f119-${lr}`,
        'propulsion',
        'engine-core',
        false,
        [0, 0.4, 4.6],
        engCasing.tris,
        [engCasing.hull]
      )
    );

    // 7 sequential F119 cutaway stages with monotonically increasing aft explode vectors
    const fan = buildCylinderZ(xEng, 1.70, fsToZ(12.66), fsToZ(13.26), 0.48, 0.46, 12);
    parts.push(makePart(`f119-fan-${lr}`, 'propulsion', 'titanium', false, [side * 0.8, -0.3, 3.0], fan.tris, [fan.hull]));

    const hpc = buildCylinderZ(xEng, 1.70, fsToZ(13.34), fsToZ(14.04), 0.44, 0.42, 12);
    parts.push(makePart(`f119-hpc-${lr}`, 'propulsion', 'engine-core', false, [side * 0.8, -0.3, 3.6], hpc.tris, [hpc.hull]));

    const comb = buildCylinderZ(xEng, 1.70, fsToZ(14.12), fsToZ(14.56), 0.45, 0.45, 12);
    parts.push(makePart(`f119-combustor-${lr}`, 'propulsion', 'nozzle-ceramic', false, [side * 0.8, -0.3, 4.2], comb.tris, [comb.hull]));

    const hpt = buildCylinderZ(xEng, 1.70, fsToZ(14.64), fsToZ(14.96), 0.45, 0.45, 12);
    parts.push(makePart(`f119-hpt-${lr}`, 'propulsion', 'titanium', false, [side * 0.8, -0.3, 4.8], hpt.tris, [hpt.hull]));

    const lpt = buildCylinderZ(xEng, 1.70, fsToZ(15.04), fsToZ(15.36), 0.47, 0.47, 12);
    parts.push(makePart(`f119-lpt-${lr}`, 'propulsion', 'titanium', false, [side * 0.8, -0.3, 5.4], lpt.tris, [lpt.hull]));

    const aug = buildCylinderZ(xEng, 1.70, fsToZ(15.44), fsToZ(16.54), 0.48, 0.48, 12);
    parts.push(makePart(`f119-augmentor-${lr}`, 'propulsion', 'engine-core', false, [side * 0.8, -0.3, 6.0], aug.tris, [aug.hull]));

    const flaps = makeBox(xEng, 1.70, fsToZ(16.72), 0.84, 0.56, 0.24);
    parts.push(makePart(`f119-nozzle-flaps-${lr}`, 'propulsion', 'nozzle-ceramic', false, [side * 0.8, -0.3, 6.8], flaps.tris, [flaps.hull]));

    const noz = makeBox(xEng, 1.72, fsToZ(17.68), 1.04, 0.66, 1.52);
    parts.push(makePart(`nozzle-2d-${lr}`, 'propulsion', 'nozzle-ceramic', true, [0, 0, 7.6], noz.tris, [noz.hull]));
  }

  {
    // Stowed ventral emergency arresting tailhook between engine nacelles
    const hook = makeBox(0, 1.32, fsToZ(15.20), 0.14, 0.10, 1.45);
    parts.push(makePart('tail-hook', 'empennage', 'gear-strut', false, [0, -1.6, 2.8], hook.tris, [hook.hull]));
  }

  {
    const lb = buildSweptPanel(-1, 1.36, 1.74, 16.92, 18.92, 17.10, 18.88, 1.88, 1.88, 0.62, 0.30);
    const rb = buildSweptPanel(1, 1.36, 1.74, 16.92, 18.92, 17.10, 18.88, 1.88, 1.88, 0.62, 0.30);
    parts.push(
      makePart(
        'tail-booms',
        'empennage',
        'stealth-skin',
        true,
        [0, 1.2, 3.8],
        [...lb.tris, ...rb.tris],
        [lb.hull, rb.hull]
      )
    );
  }

  // Twin 28° Outward-Canted Vertical Stabilizers & Flush Rudders (tip Y = 5.08 m, |X| = 2.85 m)
  for (const side of [-1, 1] as const) {
    const lr = side === -1 ? 'left' : 'right';
    const vtail = buildCantedVerticalPanel(
      side,
      1.45,
      2.45,
      2.85,
      5.08,
      13.00,
      15.62,
      14.95,
      16.12,
      0.18,
      0.06
    );
    parts.push(
      makePart(
        `vertical-stabilizer-${lr}`,
        'empennage',
        'stealth-skin',
        true,
        [side * 2.0, 1.2, 2.8],
        vtail.tris,
        [vtail.hull]
      )
    );

    const rud = buildCantedVerticalPanel(
      side,
      1.45,
      2.45,
      2.85,
      5.08,
      15.68,
      16.86,
      16.18,
      16.86,
      0.14,
      0.05
    );
    parts.push(
      makePart(
        `rudder-${lr}`,
        'empennage',
        'stealth-dark',
        true,
        [side * 2.4, 1.4, 3.8],
        rud.tris,
        [rud.hull]
      )
    );

    // All-Moving Horizontal Stabilators (clipped-diamond tapered planform)
    const stab = buildSweptPanel(
      side,
      1.80,
      4.40,
      15.10,
      18.65,
      17.44,
      17.85,
      1.88,
      1.84,
      0.16,
      0.05
    );
    parts.push(
      makePart(
        `stabilator-${lr}`,
        'empennage',
        'stealth-skin',
        true,
        [side * 2.8, 0.2, 3.8],
        stab.tris,
        [stab.hull]
      )
    );
  }

  // =========================================================================
  // 6. TRICYCLE LANDING GEAR (Cylindrical oleo struts, round tires, bay doors)
  // =========================================================================
  {
    const zN = fsToZ(4.30);
    const strut = buildCylinderY(0, zN, 0.24, 1.20, 0.085, 10);
    const axle = buildCylinderX(-0.20, 0.20, 0.22, zN, 0.045, 8);
    const wL = buildCylinderX(-0.21, -0.09, 0.22, zN, 0.22, 14);
    const wR = buildCylinderX(0.09, 0.21, 0.22, zN, 0.22, 14);
    const door = makeBox(0.20, 0.98, zN, 0.03, 0.36, 0.84);
    parts.push(
      makePart(
        'nose-landing-gear',
        'gear',
        'gear-strut',
        false,
        [0, -2.0, -1.2],
        [...strut.tris, ...axle.tris, ...wL.tris, ...wR.tris, ...door.tris],
        [strut.hull, axle.hull, wL.hull, wR.hull, door.hull]
      )
    );

    const nDoor = makeBox(-0.20, 0.98, zN, 0.03, 0.36, 0.84);
    parts.push(makePart('nose-gear-doors', 'gear', 'stealth-skin', false, [-0.8, -2.0, -1.2], nDoor.tris, [nDoor.hull]));
  }
  for (const side of [-1, 1] as const) {
    const lr = side === -1 ? 'left' : 'right';
    const x = side * 1.615;
    const zM = fsToZ(11.20);
    const strut = buildCylinderY(x, zM, 0.30, 1.18, 0.10, 10);
    const wheel = buildCylinderX(x - 0.12, x + 0.12, 0.30, zM, 0.30, 16);
    const door = makeBox(x + side * 0.12, 0.96, zM, 0.03, 0.38, 0.92);
    parts.push(
      makePart(
        `main-landing-gear-${lr}`,
        'gear',
        'gear-strut',
        false,
        [side * 1.2, -2.0, 0],
        [...strut.tris, ...wheel.tris, ...door.tris],
        [strut.hull, wheel.hull, door.hull]
      )
    );
  }
  {
    const zM = fsToZ(11.20);
    const mDoorL = makeBox(-1.44, 0.96, zM, 0.03, 0.38, 0.92);
    const mDoorR = makeBox(1.44, 0.96, zM, 0.03, 0.38, 0.92);
    parts.push(
      makePart(
        'main-gear-doors',
        'gear',
        'stealth-skin',
        false,
        [0, -2.2, 0.6],
        [...mDoorL.tris, ...mDoorR.tris],
        [mDoorL.hull, mDoorR.hull]
      )
    );
  }

  return parts;
}

export const F22_BUILT_PARTS: readonly BuiltPartMesh[] = buildAllF22Parts();

// ============================================================================
// Exact 3D Separating Axis Theorem (SAT) Collision Engine
// ============================================================================

function projectHull(
  hull: ConvexHull,
  offset: Vec3Tuple,
  axis: Vec3Tuple
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of hull.vertices) {
    const p =
      (v[0] + offset[0]) * axis[0] +
      (v[1] + offset[1]) * axis[1] +
      (v[2] + offset[2]) * axis[2];
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
}

function hullsIntersectSAT(
  a: ConvexHull,
  offA: Vec3Tuple,
  b: ConvexHull,
  offB: Vec3Tuple,
  toleranceM: number
): boolean {
  // Test face normals of A and B (plus principal axes)
  const axes: Vec3Tuple[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    ...a.normals,
    ...b.normals,
  ];
  for (const axis of axes) {
    const [minA, maxA] = projectHull(a, offA, axis);
    const [minB, maxB] = projectHull(b, offB, axis);
    if (maxA - toleranceM <= minB || maxB - toleranceM <= minA) {
      return false; // Separating plane found!
    }
  }
  return true;
}

export function findExactPartCollisionsAtExplode(
  explodeFactor: number,
  toleranceM = 0.005
): Array<{ a: string; b: string }> {
  const overlaps: Array<{ a: string; b: string }> = [];
  const offsets: Vec3Tuple[] = F22_BUILT_PARTS.map((p) => [
    p.explode[0] * explodeFactor,
    p.explode[1] * explodeFactor,
    p.explode[2] * explodeFactor,
  ]);

  for (let i = 0; i < F22_BUILT_PARTS.length; i++) {
    for (let j = i + 1; j < F22_BUILT_PARTS.length; j++) {
      const pa = F22_BUILT_PARTS[i]!;
      const pb = F22_BUILT_PARTS[j]!;
      const offA = offsets[i]!;
      const offB = offsets[j]!;
      let hit = false;
      for (const ha of pa.hulls) {
        for (const hb of pb.hulls) {
          if (hullsIntersectSAT(ha, offA, hb, offB, toleranceM)) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (hit) {
        overlaps.push({ a: pa.id, b: pb.id });
      }
    }
  }
  return overlaps;
}
