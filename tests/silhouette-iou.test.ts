import { describe, expect, it } from 'vitest';
import {
  F22_BUILT_PARTS,
  fsToZ,
  wingLeFs,
  wingTeFs,
} from '../src/scene/f22Geometry.js';
import { CONSTANTS_REGISTRY as R } from '../src/sim/config/registry.js';

type Pt2 = readonly [number, number];

interface Bounds2D {
  readonly minU: number;
  readonly maxU: number;
  readonly minV: number;
  readonly maxV: number;
}

const GRID = 200;

function edgeFn(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (px - ax) * (by - ay) - (py - ay) * (bx - ax);
}

function rasterizeTriangle(
  buf: Uint8Array,
  bounds: Bounds2D,
  a: Pt2,
  b: Pt2,
  c: Pt2
): void {
  const toIx = (u: number) => ((u - bounds.minU) / (bounds.maxU - bounds.minU)) * (GRID - 1);
  const toIy = (v: number) => ((v - bounds.minV) / (bounds.maxV - bounds.minV)) * (GRID - 1);

  const ax = toIx(a[0]), ay = toIy(a[1]);
  const bx = toIx(b[0]), by = toIy(b[1]);
  const cx = toIx(c[0]), cy = toIy(c[1]);

  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(GRID - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(GRID - 1, Math.ceil(Math.max(ay, by, cy)));

  const area = edgeFn(ax, ay, bx, by, cx, cy);
  if (Math.abs(area) < 1e-6) return;
  const sign = area > 0 ? 1 : -1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = edgeFn(bx, by, cx, cy, px, py) * sign;
      const w1 = edgeFn(cx, cy, ax, ay, px, py) * sign;
      const w2 = edgeFn(ax, ay, bx, by, px, py) * sign;
      if (w0 >= -1e-4 && w1 >= -1e-4 && w2 >= -1e-4) {
        buf[y * GRID + x] = 1;
      }
    }
  }
}

function rasterizePolygon(buf: Uint8Array, bounds: Bounds2D, poly: readonly Pt2[]): void {
  for (let i = 1; i < poly.length - 1; i++) {
    rasterizeTriangle(buf, bounds, poly[0]!, poly[i]!, poly[i + 1]!);
  }
}

function rasterizeModelView(
  bounds: Bounds2D,
  project: (x: number, y: number, z: number) => Pt2
): Uint8Array {
  const buf = new Uint8Array(GRID * GRID);
  for (const part of F22_BUILT_PARTS) {
    const pos = part.positions;
    for (let i = 0; i < pos.length; i += 9) {
      const a = project(pos[i]!, pos[i + 1]!, pos[i + 2]!);
      const b = project(pos[i + 3]!, pos[i + 4]!, pos[i + 5]!);
      const c = project(pos[i + 6]!, pos[i + 7]!, pos[i + 8]!);
      rasterizeTriangle(buf, bounds, a, b, c);
    }
  }
  return buf;
}

function computeIoU(a: Uint8Array, b: Uint8Array): number {
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]! > 0;
    const bv = b[i]! > 0;
    if (av && bv) inter++;
    if (av || bv) union++;
  }
  return union === 0 ? 0 : inter / union;
}

describe('F-22 Orthographic Silhouette Fidelity (IoU >= 0.85 against REFERENCE_GEOMETRY)', () => {
  it('achieves Top-view (planform) IoU >= 0.85', () => {
    const bounds: Bounds2D = { minU: -7.5, maxU: 7.5, minV: -10.2, maxV: 10.2 };
    const modelMask = rasterizeModelView(bounds, (x, _y, z) => [x, z]);

    const refMask = new Uint8Array(GRID * GRID);
    // Reference fuselage planform from REFERENCE_GEOMETRY.md
    rasterizePolygon(refMask, bounds, [
      [0, fsToZ(0)],
      [0.82, fsToZ(2.26)],
      [1.05, fsToZ(3.40)],
      [1.35, fsToZ(6.40)],
      [1.82, fsToZ(6.80)],
      [1.82, fsToZ(12.60)],
      [1.54, fsToZ(12.60)],
      [1.74, fsToZ(18.92)],
      [0, fsToZ(18.45)],
      [-1.74, fsToZ(18.92)],
      [-1.54, fsToZ(12.60)],
      [-1.82, fsToZ(12.60)],
      [-1.82, fsToZ(6.80)],
      [-1.35, fsToZ(6.40)],
      [-1.05, fsToZ(3.40)],
      [-0.82, fsToZ(2.26)],
    ]);
    // Reference clipped-diamond wings (42° LE, -17° TE, 13.56 m span) & stabilators
    for (const s of [-1, 1] as const) {
      rasterizePolygon(refMask, bounds, [
        [s * 1.85, fsToZ(wingLeFs(1.85))],
        [s * 6.78, fsToZ(wingLeFs(6.78))],
        [s * 6.78, fsToZ(wingTeFs(6.78))],
        [s * 1.85, fsToZ(wingTeFs(1.85))],
      ]);
      rasterizePolygon(refMask, bounds, [
        [s * 1.75, fsToZ(15.10)],
        [s * 4.40, fsToZ(17.44)],
        [s * 4.40, fsToZ(17.85)],
        [s * 1.75, fsToZ(18.65)],
      ]);
      // Vertical tail projection in top view (canted outward to |X| = 2.85 m)
      rasterizePolygon(refMask, bounds, [
        [s * 1.45, fsToZ(13.00)],
        [s * 2.85, fsToZ(14.95)],
        [s * 2.85, fsToZ(16.86)],
        [s * 1.45, fsToZ(16.86)],
      ]);
    }

    const iou = computeIoU(modelMask, refMask);
    expect(iou, `Top silhouette IoU was ${iou.toFixed(3)}`).toBeGreaterThanOrEqual(0.85);
  });

  it('achieves Side-view (profile) IoU >= 0.85', () => {
    const bounds: Bounds2D = { minU: -10.2, maxU: 10.2, minV: -0.3, maxV: 5.6 };
    const modelMask = rasterizeModelView(bounds, (_x, y, z) => [z, y]);

    const refMask = new Uint8Array(GRID * GRID);
    // Fuselage side profile (nose tip FS 0 -> tail FS 18.92)
    rasterizePolygon(refMask, bounds, [
      [fsToZ(0.0), 1.70],
      [fsToZ(2.26), 2.20],
      [fsToZ(3.36), 2.34],
      [fsToZ(3.80), 3.15],
      [fsToZ(4.70), 3.44],
      [fsToZ(5.80), 3.15],
      [fsToZ(6.46), 2.74],
      [fsToZ(12.60), 2.66],
      [fsToZ(16.86), 2.48],
      [fsToZ(18.92), 2.02],
      [fsToZ(18.92), 1.65],
      [fsToZ(16.86), 1.24],
      [fsToZ(12.60), 1.20],
      [fsToZ(6.40), 1.20],
      [fsToZ(3.36), 1.24],
      [fsToZ(1.50), 1.40],
    ]);
    // Canted vertical tail side silhouette (reaches Y = 5.08 m)
    rasterizePolygon(refMask, bounds, [
      [fsToZ(13.00), 2.45],
      [fsToZ(14.95), R.F22_HEIGHT_M.value],
      [fsToZ(16.86), R.F22_HEIGHT_M.value],
      [fsToZ(16.86), 2.45],
    ]);
    // Tricycle gear side silhouettes
    rasterizePolygon(refMask, bounds, [
      [fsToZ(4.08), 0.0],
      [fsToZ(4.52), 0.0],
      [fsToZ(4.52), 1.24],
      [fsToZ(4.08), 1.24],
    ]);
    rasterizePolygon(refMask, bounds, [
      [fsToZ(10.90), 0.0],
      [fsToZ(11.50), 0.0],
      [fsToZ(11.50), 1.20],
      [fsToZ(10.90), 1.20],
    ]);

    const iou = computeIoU(modelMask, refMask);
    expect(iou, `Side silhouette IoU was ${iou.toFixed(3)}`).toBeGreaterThanOrEqual(0.85);
  });

  it('achieves Front-view IoU >= 0.85 (verifying 28° canted tails & wing span)', () => {
    const bounds: Bounds2D = { minU: -7.5, maxU: 7.5, minV: -0.3, maxV: 5.6 };
    const modelMask = rasterizeModelView(bounds, (x, y, _z) => [x, y]);

    const refMask = new Uint8Array(GRID * GRID);
    // Center fuselage + intakes + canopy dome front silhouette
    rasterizePolygon(refMask, bounds, [
      [-1.82, 1.65],
      [-1.40, 2.66],
      [-0.60, 2.74],
      [-0.50, 3.30],
      [0.0, 3.44],
      [0.50, 3.30],
      [0.60, 2.74],
      [1.40, 2.66],
      [1.82, 1.65],
      [1.40, 1.20],
      [-1.40, 1.20],
    ]);
    // Wings front projection (span 13.56 m, thickness taper 0.32 -> 0.07 m)
    for (const s of [-1, 1] as const) {
      rasterizePolygon(refMask, bounds, [
        [s * 1.80, 1.80],
        [s * 6.78, 1.80],
        [s * 6.78, 1.88],
        [s * 1.80, 2.12],
      ]);
      // 28° outward-canted twin vertical tails (root |X|=1.45,Y=2.45 -> tip |X|=2.85,Y=5.08)
      rasterizePolygon(refMask, bounds, [
        [s * 1.36, 2.45],
        [s * 1.54, 2.45],
        [s * 2.88, R.F22_HEIGHT_M.value],
        [s * 2.82, R.F22_HEIGHT_M.value],
      ]);
      // Main landing gear legs
      rasterizePolygon(refMask, bounds, [
        [s * 1.50, 0.0],
        [s * 1.73, 0.0],
        [s * 1.73, 1.20],
        [s * 1.50, 1.20],
      ]);
    }
    // Nose gear
    rasterizePolygon(refMask, bounds, [
      [-0.22, 0.0],
      [0.22, 0.0],
      [0.22, 1.20],
      [-0.22, 1.20],
    ]);

    const iou = computeIoU(modelMask, refMask);
    expect(iou, `Front silhouette IoU was ${iou.toFixed(3)}`).toBeGreaterThanOrEqual(0.85);
  });
});
