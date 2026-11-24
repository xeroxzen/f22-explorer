import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderReadmeLabelCountsMarkdown } from '../scripts/generate-readme-stats.js';
import { getComponentContent } from '../src/content/registry.js';
import { GUIDED_TOURS } from '../src/content/tours.js';
import {
  encodeExplorerStateToQuery,
  parseExplorerQuery,
} from '../src/store/deepLink.js';

describe('Phase 5 Guided Tours, Deep Links & README Stats', () => {
  it('defines 3 guided tours (6–10 steps each) where every step cites a valid Inspector component', () => {
    expect(GUIDED_TOURS.map((t) => t.id)).toEqual(['anatomy', 'cockpit', 'engine-start']);

    for (const tour of GUIDED_TOURS) {
      expect(tour.steps.length).toBeGreaterThanOrEqual(6);
      expect(tour.steps.length).toBeLessThanOrEqual(10);
      for (const step of tour.steps) {
        const content = getComponentContent(step.partId);
        expect(content, `Tour ${tour.id} step ${step.id} references unknown part ${step.partId}`).not.toBeNull();
        expect(content!.sources.length).toBeGreaterThan(0);
      }
    }
  });

  it('encodes and parses shareable deep links cleanly and never restores mid-start engine phases', () => {
    const query = encodeExplorerStateToQuery({
      cam: 'cockpit',
      part: 'cockpit-displays-hud',
      explode: 0.45,
      canopy: true,
      mainBay: true,
      sideBays: false,
      loadout: 'sdb',
      gear: false,
      engine: 'ab',
    });

    const parsed = parseExplorerQuery(query);
    expect(parsed.cam).toBe('cockpit');
    expect(parsed.part).toBe('cockpit-displays-hud');
    expect(parsed.explode).toBeCloseTo(0.45, 2);
    expect(parsed.canopy).toBe(true);
    expect(parsed.mainBay).toBe(true);
    expect(parsed.loadout).toBe('sdb');
    expect(parsed.gear).toBe(false);
    expect(parsed.engine).toBe('ab');

    // Mid-sequence phases must be ignored (never restored mid-start)
    const midStart = parseExplorerQuery('?cam=rear&engine=ENG1_MOTOR');
    expect(midStart.engine).toBeUndefined();
    const midPreset = parseExplorerQuery('?cam=rear&engine=mid-start');
    expect(midPreset.engine).toBeUndefined();
  });

  it('keeps README.md generated label counts strictly in sync with registry and content JSONs', () => {
    const readmePath = path.resolve(process.cwd(), 'README.md');
    const readme = fs.readFileSync(readmePath, 'utf8');
    const expected = renderReadmeLabelCountsMarkdown();
    expect(readme).toContain(expected);
  });
});
