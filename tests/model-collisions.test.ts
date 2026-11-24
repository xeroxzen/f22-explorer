import { describe, expect, it } from 'vitest';
import { ALL_COMPONENTS } from '../src/content/registry.js';
import {
  F22_BUILT_PARTS,
  findExactPartCollisionsAtExplode,
} from '../src/scene/f22Geometry.js';

describe('Phase 2 Lofted F-22 Part Geometry & Exact SAT Collision Guards', () => {
  it('covers all 44 physical sub-parts in the Phase 1 content catalog 1:1', () => {
    const physicalContentIds = ALL_COMPONENTS.filter((c) => c.parentId !== null)
      .map((c) => c.id)
      .sort();
    const builtIds = F22_BUILT_PARTS.map((p) => p.id).sort();
    expect(builtIds).toEqual(physicalContentIds);
  });

  it('has zero unintended part interpenetration in the assembled state (explode = 0)', () => {
    const overlaps = findExactPartCollisionsAtExplode(0, 0.005);
    expect(overlaps, `Assembled overlaps: ${JSON.stringify(overlaps)}`).toEqual([]);
  });

  it('has zero collisions along directional explode vectors at 25%, 50%, 75%, and 100%', () => {
    for (const factor of [0.25, 0.5, 0.75, 1.0]) {
      const overlaps = findExactPartCollisionsAtExplode(factor, 0.005);
      expect(
        overlaps,
        `Collisions at explode=${factor}: ${JSON.stringify(overlaps)}`
      ).toEqual([]);
    }
  });
});
