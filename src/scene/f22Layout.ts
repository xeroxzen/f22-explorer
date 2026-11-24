import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';

export type PartShapeKind =
  | 'radome'
  | 'fuselage-fwd'
  | 'fuselage-center'
  | 'fuselage-aft'
  | 'tail-booms'
  | 'intake'
  | 'canopy'
  | 'wing'
  | 'lef'
  | 'flaperon'
  | 'aileron'
  | 'vtail'
  | 'rudder'
  | 'stabilator'
  | 'engine'
  | 'nozzle'
  | 'gear-nose'
  | 'gear-main'
  | 'bay-frame'
  | 'bay-doors'
  | 'ordnance'
  | 'cannon'
  | 'cockpit-tub'
  | 'seat'
  | 'displays'
  | 'hotas'
  | 'box';

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

export interface PartPlacement {
  readonly id: string;
  readonly shape: PartShapeKind;
  readonly material: MaterialRole;
  /** True for outer skin parts that become translucent in X-ray mode. */
  readonly isOuterSkin: boolean;
  /** Center position [x, y, z] in meters in the assembled state (Z = FS - 9.46). */
  readonly center: readonly [number, number, number];
  /** Non-overlapping bounding box extents [widthX, heightY, lengthZ] in meters. */
  readonly size: readonly [number, number, number];
  /** Linear explode displacement [dx, dy, dz] at explode = 1. */
  readonly explode: readonly [number, number, number];
  /** Optional mirror sign (-1 for left, +1 for right). */
  readonly side?: -1 | 1;
}

const HALF_LEN = R.F22_LENGTH_M.value / 2; // 9.46 m
const fsToZ = (fsStart: number, fsEnd: number): number =>
  (fsStart + fsEnd) / 2 - HALF_LEN;

/**
 * Single-source parametric placement table for all 44 physical sub-parts of the F-22.
 *
 * Every bounding box is explicitly engineered so:
 *  1. Master envelope matches USAF Fact Sheet: Length 18.92 m, Wingspan 13.56 m, Height 5.08 m.
 *  2. Zero AABB interpenetration at explode = 0 AND along explode in (0, 1].
 *  3. Outer skins surround internal bays without overlapping their volumes.
 */
export const F22_PART_PLACEMENTS: readonly PartPlacement[] = [
  // =========================================================================
  // 1. Forward Fuselage & Cockpit (FS 0.00 -> 6.40)
  // =========================================================================
  {
    id: 'radome',
    shape: 'radome',
    material: 'stealth-dark',
    isOuterSkin: true,
    center: [0, 1.72, fsToZ(0.0, 2.26)],
    size: [1.44, 0.96, 2.26],
    explode: [0, 0, -6.2],
  },
  {
    id: 'nose-avionics-bay',
    shape: 'fuselage-fwd',
    material: 'stealth-skin',
    isOuterSkin: true,
    center: [0, 1.70, fsToZ(2.28, 3.38)],
    size: [1.72, 0.90, 1.10],
    explode: [0, 0, -4.4],
  },
  {
    id: 'forward-fuselage',
    shape: 'fuselage-fwd',
    material: 'stealth-skin',
    isOuterSkin: true,
    center: [0, 1.66, fsToZ(3.40, 6.38)],
    size: [2.32, 0.80, 2.98],
    explode: [0, -0.35, -2.5],
  },
  {
    id: 'cockpit-tub',
    shape: 'cockpit-tub',
    material: 'cockpit-dark',
    isOuterSkin: false,
    center: [0, 2.20, fsToZ(3.44, 6.26)],
    size: [1.14, 0.24, 2.82],
    explode: [0, 1.5, -2.5],
  },
  {
    id: 'cockpit-displays-hud',
    shape: 'displays',
    material: 'cockpit-dark',
    isOuterSkin: false,
    center: [0, 2.50, fsToZ(3.56, 4.18)],
    size: [0.84, 0.30, 0.62],
    explode: [0, 2.4, -3.3],
  },
  {
    id: 'hotas-controls',
    shape: 'hotas',
    material: 'cockpit-dark',
    isOuterSkin: false,
    center: [0, 2.46, fsToZ(4.24, 4.74)],
    size: [0.90, 0.22, 0.50],
    explode: [0, 2.1, -2.5],
  },
  {
    id: 'aces-ii-seat',
    shape: 'seat',
    material: 'cockpit-dark',
    isOuterSkin: false,
    center: [0, 2.54, fsToZ(4.82, 5.56)],
    size: [0.62, 0.38, 0.74],
    explode: [0, 2.9, -2.4],
  },
  {
    id: 'canopy',
    shape: 'canopy',
    material: 'canopy-gold',
    isOuterSkin: true,
    center: [0, 3.09, fsToZ(3.26, 6.34)],
    size: [1.16, 0.68, 3.08],
    explode: [0, 4.2, -2.5],
  },

  // =========================================================================
  // 2. Center Fuselage, Intakes, Fuel & APU (FS 6.40 -> 12.60)
  // =========================================================================
  {
    id: 'center-fuselage',
    shape: 'fuselage-center',
    material: 'stealth-skin',
    isOuterSkin: true,
    // Dorsal structural spine lifts cleanly above internal fuel tanks
    center: [0, 2.44, fsToZ(6.42, 12.56)],
    size: [2.56, 0.34, 6.14],
    explode: [0, 1.8, 0],
  },
  {
    id: 'intake-left',
    shape: 'intake',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: -1,
    center: [-1.72, 1.96, fsToZ(6.42, 12.56)],
    size: [0.80, 0.74, 6.14],
    explode: [-2.4, 0.2, -0.4],
  },
  {
    id: 'intake-right',
    shape: 'intake',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: 1,
    center: [1.72, 1.96, fsToZ(6.42, 12.56)],
    size: [0.80, 0.74, 6.14],
    explode: [2.4, 0.2, -0.4],
  },
  {
    id: 'internal-fuel-tanks',
    shape: 'box',
    material: 'titanium',
    isOuterSkin: false,
    center: [0, 2.04, fsToZ(6.82, 12.32)],
    size: [2.36, 0.36, 5.50],
    explode: [0, 0, 0],
  },
  {
    id: 'refueling-receptacle',
    shape: 'box',
    material: 'stealth-dark',
    isOuterSkin: true,
    center: [0, 2.65, fsToZ(8.40, 9.60)],
    size: [0.46, 0.05, 1.16],
    explode: [0, 3.2, 0],
  },
  {
    id: 'apu-bay',
    shape: 'box',
    material: 'stealth-dark',
    isOuterSkin: false,
    center: [0, 2.66, fsToZ(10.80, 12.20)],
    size: [0.54, 0.06, 1.32],
    explode: [0, 3.2, 1.0],
  },

  // =========================================================================
  // 3. Internal Weapons Bays & Gun
  // =========================================================================
  {
    id: 'main-weapons-bay',
    shape: 'bay-frame',
    material: 'bay-white',
    isOuterSkin: false,
    center: [0, 1.72, fsToZ(7.10, 11.40)],
    size: [2.10, 0.18, 4.30],
    explode: [0, -1.6, 0],
  },
  {
    id: 'internal-ordnance-display',
    shape: 'ordnance',
    material: 'ordnance-body',
    isOuterSkin: false,
    center: [0, 1.44, fsToZ(7.40, 11.10)],
    size: [1.84, 0.28, 3.70],
    explode: [0, -2.6, 0],
  },
  {
    id: 'main-bay-doors',
    shape: 'bay-doors',
    material: 'stealth-skin',
    isOuterSkin: true,
    center: [0, 1.21, fsToZ(7.10, 11.40)],
    size: [2.12, 0.10, 4.30],
    explode: [0, -3.6, 0],
  },
  {
    id: 'side-weapons-bay-left',
    shape: 'bay-frame',
    material: 'bay-white',
    isOuterSkin: false,
    side: -1,
    center: [-1.42, 1.38, fsToZ(7.20, 10.60)],
    size: [0.46, 0.34, 3.40],
    explode: [-3.1, -0.8, 0],
  },
  {
    id: 'side-weapons-bay-right',
    shape: 'bay-frame',
    material: 'bay-white',
    isOuterSkin: false,
    side: 1,
    center: [1.42, 1.38, fsToZ(7.20, 10.60)],
    size: [0.46, 0.34, 3.40],
    explode: [3.1, -0.8, 0],
  },
  {
    id: 'side-bay-doors',
    shape: 'bay-doors',
    material: 'stealth-skin',
    isOuterSkin: true,
    center: [0, 1.38, fsToZ(7.20, 10.60)],
    // Thin outer lateral skins flanking side bays (split mesh at X = ±1.74)
    size: [3.60, 0.34, 3.40],
    explode: [0, -1.3, 0],
  },
  {
    id: 'm61a2-cannon',
    shape: 'cannon',
    material: 'stealth-dark',
    isOuterSkin: false,
    center: [1.66, 2.44, fsToZ(7.80, 10.10)],
    size: [0.24, 0.16, 2.26],
    explode: [2.3, 1.4, -0.3],
  },

  // =========================================================================
  // 4. Main Wings & Wing Control Surfaces (Wingspan = 13.56 m, X = ±6.78 m)
  // =========================================================================
  {
    id: 'wing-left',
    shape: 'wing',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: -1,
    center: [-4.48, 1.96, fsToZ(7.55, 13.10)],
    size: [4.60, 0.22, 5.55],
    explode: [-3.2, 0, 0],
  },
  {
    id: 'wing-right',
    shape: 'wing',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: 1,
    center: [4.48, 1.96, fsToZ(7.55, 13.10)],
    size: [4.60, 0.22, 5.55],
    explode: [3.2, 0, 0],
  },
  {
    id: 'lef-left',
    shape: 'lef',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: -1,
    center: [-4.35, 1.96, fsToZ(6.72, 7.48)],
    size: [4.30, 0.12, 0.76],
    explode: [-4.3, 0, -1.3],
  },
  {
    id: 'lef-right',
    shape: 'lef',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: 1,
    center: [4.35, 1.96, fsToZ(6.72, 7.48)],
    size: [4.30, 0.12, 0.76],
    explode: [4.3, 0, -1.3],
  },
  {
    id: 'flaperon-left',
    shape: 'flaperon',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: -1,
    center: [-3.30, 1.96, fsToZ(13.16, 14.08)],
    size: [2.24, 0.12, 0.92],
    explode: [-3.9, 0, 1.3],
  },
  {
    id: 'flaperon-right',
    shape: 'flaperon',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: 1,
    center: [3.30, 1.96, fsToZ(13.16, 14.08)],
    size: [2.24, 0.12, 0.92],
    explode: [3.9, 0, 1.3],
  },
  {
    id: 'aileron-left',
    shape: 'aileron',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: -1,
    center: [-5.62, 1.96, fsToZ(13.16, 13.84)],
    size: [2.20, 0.10, 0.68],
    explode: [-4.7, 0, 1.3],
  },
  {
    id: 'aileron-right',
    shape: 'aileron',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: 1,
    center: [5.62, 1.96, fsToZ(13.16, 13.84)],
    size: [2.20, 0.10, 0.68],
    explode: [4.7, 0, 1.3],
  },

  // =========================================================================
  // 5. Aft Fuselage, Empennage & Twin F119 Propulsion (FS 12.60 -> 18.92)
  // =========================================================================
  {
    id: 'aft-fuselage',
    shape: 'fuselage-aft',
    material: 'stealth-skin',
    isOuterSkin: true,
    // Dorsal deck above twin F119 engine bays
    center: [0, 2.44, fsToZ(12.62, 16.86)],
    size: [3.08, 0.34, 4.24],
    explode: [0, 1.2, 2.6],
  },
  {
    id: 'engine-f119-left',
    shape: 'engine',
    material: 'engine-core',
    isOuterSkin: false,
    side: -1,
    center: [-0.74, 1.72, fsToZ(12.62, 16.86)],
    size: [1.06, 1.02, 4.24],
    explode: [0, -0.5, 4.6],
  },
  {
    id: 'engine-f119-right',
    shape: 'engine',
    material: 'engine-core',
    isOuterSkin: false,
    side: 1,
    center: [0.74, 1.72, fsToZ(12.62, 16.86)],
    size: [1.06, 1.02, 4.24],
    explode: [0, -0.5, 4.6],
  },
  {
    id: 'nozzle-2d-left',
    shape: 'nozzle',
    material: 'nozzle-ceramic',
    isOuterSkin: true,
    side: -1,
    center: [-0.74, 1.72, fsToZ(16.92, 18.45)],
    size: [1.08, 0.68, 1.53],
    explode: [0, -0.5, 6.8],
  },
  {
    id: 'nozzle-2d-right',
    shape: 'nozzle',
    material: 'nozzle-ceramic',
    isOuterSkin: true,
    side: 1,
    center: [0.74, 1.72, fsToZ(16.92, 18.45)],
    size: [1.08, 0.68, 1.53],
    explode: [0, -0.5, 6.8],
  },
  {
    id: 'tail-booms',
    shape: 'tail-booms',
    material: 'stealth-skin',
    isOuterSkin: true,
    // Flanking booms outside nozzles (split at X = ±1.56)
    center: [0, 1.88, fsToZ(16.92, 18.92)],
    size: [3.48, 0.64, 2.00],
    explode: [0, 1.2, 4.2],
  },
  {
    id: 'vertical-stabilizer-left',
    shape: 'vtail',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: -1,
    center: [-2.15, 3.86, fsToZ(13.00, 15.65)],
    size: [1.40, 2.44, 2.65],
    explode: [-2.2, 2.2, 2.8],
  },
  {
    id: 'vertical-stabilizer-right',
    shape: 'vtail',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: 1,
    center: [2.15, 3.86, fsToZ(13.00, 15.65)],
    size: [1.40, 2.44, 2.65],
    explode: [2.2, 2.2, 2.8],
  },
  {
    id: 'rudder-left',
    shape: 'rudder',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: -1,
    center: [-2.15, 3.82, fsToZ(15.72, 16.86)],
    size: [1.30, 2.24, 1.14],
    explode: [-2.6, 2.4, 3.9],
  },
  {
    id: 'rudder-right',
    shape: 'rudder',
    material: 'stealth-dark',
    isOuterSkin: true,
    side: 1,
    center: [2.15, 3.82, fsToZ(15.72, 16.86)],
    size: [1.30, 2.24, 1.14],
    explode: [2.6, 2.4, 3.9],
  },
  {
    id: 'stabilator-left',
    shape: 'stabilator',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: -1,
    center: [-3.12, 1.88, fsToZ(15.10, 18.70)],
    size: [2.56, 0.16, 3.60],
    explode: [-3.2, 0.2, 4.3],
  },
  {
    id: 'stabilator-right',
    shape: 'stabilator',
    material: 'stealth-skin',
    isOuterSkin: true,
    side: 1,
    center: [3.12, 1.88, fsToZ(15.10, 18.70)],
    size: [2.56, 0.16, 3.60],
    explode: [3.2, 0.2, 4.3],
  },

  // =========================================================================
  // 6. Tricycle Landing Gear (Tire contact at Y = 0.00 m)
  // =========================================================================
  {
    id: 'nose-landing-gear',
    shape: 'gear-nose',
    material: 'gear-strut',
    isOuterSkin: false,
    center: [0, 0.60, fsToZ(3.80, 4.80)],
    size: [0.56, 1.20, 1.00],
    explode: [0, -1.8, -2.5],
  },
  {
    id: 'main-landing-gear-left',
    shape: 'gear-main',
    material: 'gear-strut',
    isOuterSkin: false,
    side: -1,
    center: [-1.615, 0.56, fsToZ(10.72, 11.72)],
    size: [0.64, 1.12, 1.00],
    explode: [-2.1, -1.8, 0.5],
  },
  {
    id: 'main-landing-gear-right',
    shape: 'gear-main',
    material: 'gear-strut',
    isOuterSkin: false,
    side: 1,
    center: [1.615, 0.56, fsToZ(10.72, 11.72)],
    size: [0.64, 1.12, 1.00],
    explode: [2.1, -1.8, 0.5],
  },
];

export interface Aabb {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/**
 * Compute world-space AABBs for a placement at a given explode factor [0..1].
 * Split-bilateral parts (`side-bay-doors`, `tail-booms`) return two separate sub-boxes
 * matching their physical left/right geometry so they never falsely wrap the center bay/nozzles.
 */
export function getPartBoxesAtExplode(
  part: PartPlacement,
  explodeFactor: number
): readonly Aabb[] {
  const cx = part.center[0] + part.explode[0] * explodeFactor;
  const cy = part.center[1] + part.explode[1] * explodeFactor;
  const cz = part.center[2] + part.explode[2] * explodeFactor;
  const [sx, sy, sz] = part.size;

  if (part.id === 'side-bay-doors') {
    const doorW = 0.08;
    const offset = 1.74;
    return [
      {
        minX: cx - offset - doorW / 2,
        maxX: cx - offset + doorW / 2,
        minY: cy - sy / 2,
        maxY: cy + sy / 2,
        minZ: cz - sz / 2,
        maxZ: cz + sz / 2,
      },
      {
        minX: cx + offset - doorW / 2,
        maxX: cx + offset + doorW / 2,
        minY: cy - sy / 2,
        maxY: cy + sy / 2,
        minZ: cz - sz / 2,
        maxZ: cz + sz / 2,
      },
    ];
  }

  if (part.id === 'tail-booms') {
    const boomW = 0.36;
    const offset = 1.56;
    return [
      {
        minX: cx - offset - boomW / 2,
        maxX: cx - offset + boomW / 2,
        minY: cy - sy / 2,
        maxY: cy + sy / 2,
        minZ: cz - sz / 2,
        maxZ: cz + sz / 2,
      },
      {
        minX: cx + offset - boomW / 2,
        maxX: cx + offset + boomW / 2,
        minY: cy - sy / 2,
        maxY: cy + sy / 2,
        minZ: cz - sz / 2,
        maxZ: cz + sz / 2,
      },
    ];
  }

  return [
    {
      minX: cx - sx / 2,
      maxX: cx + sx / 2,
      minY: cy - sy / 2,
      maxY: cy + sy / 2,
      minZ: cz - sz / 2,
      maxZ: cz + sz / 2,
    },
  ];
}

function boxesOverlap(a: Aabb, b: Aabb, toleranceM: number): boolean {
  return (
    a.minX + toleranceM < b.maxX &&
    a.maxX - toleranceM > b.minX &&
    a.minY + toleranceM < b.maxY &&
    a.maxY - toleranceM > b.minY &&
    a.minZ + toleranceM < b.maxZ &&
    a.maxZ - toleranceM > b.minZ
  );
}

/**
 * Pure collision check across all 44 physical parts at any explode factor.
 */
export function findPartCollisionsAtExplode(
  explodeFactor: number,
  toleranceM = 0.005
): Array<{ a: string; b: string }> {
  const all = F22_PART_PLACEMENTS.map((p) => ({
    id: p.id,
    boxes: getPartBoxesAtExplode(p, explodeFactor),
  }));

  const overlaps: Array<{ a: string; b: string }> = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const pi = all[i]!;
      const pj = all[j]!;
      let hit = false;
      for (const ba of pi.boxes) {
        for (const bb of pj.boxes) {
          if (boxesOverlap(ba, bb, toleranceM)) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (hit) {
        overlaps.push({ a: pi.id, b: pj.id });
      }
    }
  }
  return overlaps;
}
