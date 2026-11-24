import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_COMPONENTS } from '../src/content/registry.js';
import { F22_BUILT_PARTS } from '../src/scene/f22Geometry.js';

const EXPECTED_GLB_PARTS = [
  'aft-fuselage',
  'aileron-left',
  'aileron-right',
  'canopy',
  'center-fuselage',
  'cockpit-tub',
  'flaperon-left',
  'flaperon-right',
  'forward-fuselage',
  'intake-caret-left',
  'intake-caret-right',
  'main-bay-doors',
  'main-gear-doors',
  'main-landing-gear-left',
  'main-landing-gear-right',
  'main-weapons-bay',
  'nose-gear-doors',
  'nose-landing-gear',
  'nozzle-2d-left',
  'nozzle-2d-right',
  'radome',
  'rudder-left',
  'rudder-right',
  'side-bay-doors',
  'side-weapons-bay-left',
  'side-weapons-bay-right',
  'stabilator-left',
  'stabilator-right',
  'tail-booms',
  'vertical-stabilizer-left',
  'vertical-stabilizer-right',
  'wing-left',
  'wing-right',
] as const;

interface GltfJson {
  nodes?: Array<{ name?: string; mesh?: number }>;
  meshes?: Array<{
    name?: string;
    primitives?: Array<{ attributes?: { POSITION?: number } }>;
  }>;
  accessors?: Array<{ min?: number[]; max?: number[] }>;
}

function readGlbJson(): GltfJson {
  const glbPath = path.resolve(process.cwd(), 'public/models/f22-raptor-nlm.glb');
  const buf = fs.readFileSync(glbPath);
  expect(buf.toString('utf8', 0, 4)).toBe('glTF');
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as GltfJson;
}

describe('v1.1 NLM CC-BY 4.0 GLB Integrity, Part Mapping & Envelope Re-Baseline', () => {
  it('contains all 33 expected split F-22 exterior part nodes with valid bounds inside the 18.92 m envelope', () => {
    const gltf = readGlbJson();
    const nodes = gltf.nodes ?? [];
    const meshes = gltf.meshes ?? [];
    const accessors = gltf.accessors ?? [];

    const byName = new Map(nodes.map((n) => [n.name, n]));
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;

    for (const partId of EXPECTED_GLB_PARTS) {
      const node = byName.get(partId);
      expect(node, `Missing GLB node "${partId}"`).toBeDefined();
      expect(node!.mesh, `GLB node "${partId}" has no mesh`).toBeTypeOf('number');
      const mesh = meshes[node!.mesh!]!;
      const posIdx = mesh.primitives?.[0]?.attributes?.POSITION;
      expect(posIdx, `GLB mesh "${partId}" missing POSITION accessor`).toBeTypeOf('number');
      const acc = accessors[posIdx!]!;
      expect(acc.min?.length).toBe(3);
      expect(acc.max?.length).toBe(3);
      minX = Math.min(minX, acc.min![0]!);
      maxX = Math.max(maxX, acc.max![0]!);
      minY = Math.min(minY, acc.min![1]!);
      maxY = Math.max(maxY, acc.max![1]!);
      minZ = Math.min(minZ, acc.min![2]!);
      maxZ = Math.max(maxZ, acc.max![2]!);
    }

    // Normalized length must match 18.92 m within 1% and rest on ground Y = 0
    expect(maxZ - minZ).toBeCloseTo(18.92, 1);
    expect(minY).toBeGreaterThanOrEqual(-0.05);
    expect(minY).toBeLessThanOrEqual(0.05);
    expect(maxX - minX).toBeGreaterThan(13.0);
    expect(maxX - minX).toBeLessThan(14.2);
  });

  it('guarantees every non-root part in ALL_COMPONENTS maps to a selectable 3D part (GLB or parametric fallback)', () => {
    const gltf = readGlbJson();
    const glbNames = new Set((gltf.nodes ?? []).map((n) => n.name).filter(Boolean));
    const builtIds = new Set(F22_BUILT_PARTS.map((p) => p.id));

    const unmapped: string[] = [];
    for (const comp of ALL_COMPONENTS) {
      if (comp.parentId === null) continue; // root f22-airframe container
      if (!glbNames.has(comp.id) && !builtIds.has(comp.id)) {
        unmapped.push(comp.id);
      }
    }
    expect(unmapped).toEqual([]);
  });

  it('re-baselines left/right symmetric GLB parts with zero cross-centerline overlap', () => {
    const gltf = readGlbJson();
    const nodes = gltf.nodes ?? [];
    const meshes = gltf.meshes ?? [];
    const accessors = gltf.accessors ?? [];
    const byName = new Map(nodes.map((n) => [n.name, n]));

    const symPairs: Array<[string, string]> = [
      ['wing-left', 'wing-right'],
      ['vertical-stabilizer-left', 'vertical-stabilizer-right'],
      ['rudder-left', 'rudder-right'],
      ['stabilator-left', 'stabilator-right'],
      ['aileron-left', 'aileron-right'],
      ['flaperon-left', 'flaperon-right'],
      ['nozzle-2d-left', 'nozzle-2d-right'],
      ['main-landing-gear-left', 'main-landing-gear-right'],
    ];

    for (const [leftId, rightId] of symPairs) {
      const lAcc = accessors[meshes[byName.get(leftId)!.mesh!]!.primitives![0]!.attributes!.POSITION!]!;
      const rAcc = accessors[meshes[byName.get(rightId)!.mesh!]!.primitives![0]!.attributes!.POSITION!]!;
      expect(lAcc.max![0]!, `${leftId} crosses centerline into ${rightId}`).toBeLessThanOrEqual(
        rAcc.min![0]! + 0.02
      );
    }
  });
});
