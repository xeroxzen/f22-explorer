import { expect, test } from '@playwright/test';
import {
  assertNoElementOverlap,
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('Phase 2 Desktop F-22 Hangar, Disassembly & Collision Checks', () => {
  test('renders 44-part F-22 with zero assembled/explode collisions, inspector dual badges, and X-ray/section views', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.soundMuted).toBe(true);
    expect(state.registeredHitboxes.length).toBe(44);

    // 1. Assert ZERO unintended part interpenetration in assembled state (explode = 0)
    const assembledOverlaps = await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { checkPartIntersections: (tol?: number) => Array<{ a: string; b: string }> };
        }
      ).__f22debug;
      return dbg.checkPartIntersections(0.005);
    });
    expect(assembledOverlaps).toEqual([]);

    await savePhaseScreenshot(page, 'docs/screenshots/phase2/desktop-assembled.png');

    // 2. Explode to 100%, let smooth interpolation settle, assert ZERO collisions
    await page.getByTestId('explode-toggle-btn').click();
    await page.waitForTimeout(900);
    const explodedOverlaps = await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { checkPartIntersections: (tol?: number) => Array<{ a: string; b: string }> };
        }
      ).__f22debug;
      return dbg.checkPartIntersections(0.005);
    });
    expect(explodedOverlaps).toEqual([]);

    // 3. Open Part Tree, select engine-f119-left, verify Inspector dual labels + sources
    await page.getByTestId('part-tree-toggle-btn').click();
    await expect(page.getByTestId('part-tree-panel')).toBeVisible();
    await page.getByTestId('tree-part-engine-f119-left').click();
    await expect(page.getByTestId('inspector-panel')).toBeVisible();
    await expect(page.getByTestId('inspector-dual-labels')).toBeVisible();
    await assertNoElementOverlap(
      page,
      '[data-testid="top-bar"]',
      '[data-testid="inspector-panel"]'
    );

    await savePhaseScreenshot(
      page,
      'docs/screenshots/phase2/desktop-exploded-inspector.png'
    );

    // 4. Assemble + enable X-Ray + longitudinal section cut X
    await page.getByTestId('part-tree-close-btn').click();
    await page.getByTestId('inspector-close-btn').click();
    await page.getByTestId('explode-toggle-btn').click();
    await page.getByTestId('xray-toggle-btn').click();
    await page.getByTestId('clip-x').click();
    await page.waitForTimeout(900);

    await savePhaseScreenshot(page, 'docs/screenshots/phase2/desktop-xray-section.png');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
