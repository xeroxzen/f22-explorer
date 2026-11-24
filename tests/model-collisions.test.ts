import { describe, expect, it } from 'vitest';
import { ALL_COMPONENTS } from '../src/content/registry.js';
import {
  F22_PART_PLACEMENTS,
  findPartCollisionsAtExplode,
} from '../src/scene/f22Layout.js';

describe('Phase 2 Parametric F-22 Part Layout & Collision Guards', () => {
  it('covers all 44 physical sub-parts in the Phase 1 content catalog 1:1', () => {
    const physicalContentIds = ALL_COMPONENTS.filter((c) => c.parentId !== null)
      .map((c) => c.id)
      .sort();
    const layoutIds = F22_PART_PLACEMENTS.map((p) => p.id).sort();
    expect(layoutIds).toEqual(physicalContentIds);
  });

  it('has zero unintended part interpenetration in the assembled state (explode = 0)', () => {
    const overlaps = findPartCollisionsAtExplode(0, 0.005);
    expect(overlaps, `Assembled overlaps: ${JSON.stringify(overlaps)}`).toEqual([]);
  });

  it('has zero collisions along explode vectors at 25%, 50%, 75%, and 100%', () => {
    for (const factor of [0.25, 0.5, 0.75, 1.0]) {
      const overlaps = findPartCollisionsAtExplode(factor, 0.005);
      expect(
        overlaps,
        `Collisions at explode=${factor}: ${JSON.stringify(overlaps)}`
      ).toEqual([]);
    }
  });
});
