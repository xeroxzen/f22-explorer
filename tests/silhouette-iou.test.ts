import { describe, expect, it } from 'vitest';
import referenceOutlines from '../src/content/reference-outlines.json';
import { F22_BUILT_PARTS } from '../src/scene/f22Geometry.js';

type Pt2 = readonly [number, number];

interface Bounds2D {
  readonly minU: number;
  readonly maxU: number;
  readonly minV: number;
  readonly maxV: number;
}

const GRID = 200;
const { length: ENV_LEN, wingspan: ENV_SPAN, height: ENV_HEIGHT } =
  referenceOutlines.envelopeM;
const HALF_LEN = ENV_LEN / 2;

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

describe('F-22 Orthographic Silhouette Regression (ASSUMED hand-authored reference-outlines.json, IoU >= 0.85)', () => {
  it('achieves Top-view (planform) IoU >= 0.85 against hand-authored reference outline', () => {
    const bounds: Bounds2D = { minU: -7.5, maxU: 7.5, minV: -10.2, maxV: 10.2 };
    const modelMask = rasterizeModelView(bounds, (x, _y, z) => [x, z]);

    const refMask = new Uint8Array(GRID * GRID);
    for (const poly of referenceOutlines.topView.polygons) {
      const mapped: Pt2[] = poly.map(([u, v]) => [u! * ENV_SPAN, v! * ENV_LEN - HALF_LEN]);
      rasterizePolygon(refMask, bounds, mapped);
    }

    const iou = computeIoU(modelMask, refMask);
    console.log(`[Silhouette IoU] Top view: ${iou.toFixed(4)}`);
    expect(iou, `Top silhouette IoU was ${iou.toFixed(4)}`).toBeGreaterThanOrEqual(0.85);
  });

  it('achieves Side-view (profile) IoU >= 0.85 against hand-authored reference outline', () => {
    const bounds: Bounds2D = { minU: -10.2, maxU: 10.2, minV: -0.3, maxV: 5.6 };
    const modelMask = rasterizeModelView(bounds, (_x, y, z) => [z, y]);

    const refMask = new Uint8Array(GRID * GRID);
    for (const poly of referenceOutlines.sideView.polygons) {
      const mapped: Pt2[] = poly.map(([u, v]) => [u! * ENV_LEN - HALF_LEN, v! * ENV_HEIGHT]);
      rasterizePolygon(refMask, bounds, mapped);
    }

    const iou = computeIoU(modelMask, refMask);
    console.log(`[Silhouette IoU] Side view: ${iou.toFixed(4)}`);
    expect(iou, `Side silhouette IoU was ${iou.toFixed(4)}`).toBeGreaterThanOrEqual(0.85);
  });

  it('achieves Front-view IoU >= 0.85 against hand-authored reference outline', () => {
    const bounds: Bounds2D = { minU: -7.5, maxU: 7.5, minV: -0.3, maxV: 5.6 };
    const modelMask = rasterizeModelView(bounds, (x, y, _z) => [x, y]);

    const refMask = new Uint8Array(GRID * GRID);
    for (const poly of referenceOutlines.frontView.polygons) {
      const mapped: Pt2[] = poly.map(([u, v]) => [u! * ENV_SPAN, v! * ENV_HEIGHT]);
      rasterizePolygon(refMask, bounds, mapped);
    }

    const iou = computeIoU(modelMask, refMask);
    console.log(`[Silhouette IoU] Front view: ${iou.toFixed(4)}`);
    expect(iou, `Front silhouette IoU was ${iou.toFixed(4)}`).toBeGreaterThanOrEqual(0.85);
  });
});
