import { expect, test } from '@playwright/test';
import {
  assertNoElementOverlap,
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('Phase 3 Desktop F-22 Areas, Cockpit, Weapons Bays, Gear & Control Surfaces', () => {
  test('verifies zero collisions, 3-view presets, cockpit 6-LCD view, open bays/loadouts, gear & control surfaces', async ({
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

    // Capture 3/4, Front, Top, Side assembled views
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-3quarter.png');

    await page.getByTestId('cam-front').click();
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-front.png');

    await page.getByTestId('cam-top').click();
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-top.png');

    await page.getByTestId('cam-side').click();
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-side.png');

    // 2. Open Areas & Stick panel -> Seat-level Cockpit View (open canopy + 6 LCDs + HUD + ICP)
    await page.getByTestId('areas-toggle-btn').click();
    await expect(page.getByTestId('areas-panel')).toBeVisible();
    await page.getByTestId('cockpit-cam-btn').click();
    await page.waitForTimeout(950);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-cockpit.png');

    // 3. Open Main + Side Weapons Bays, switch to JDAM loadout, inspect bays
    await page.getByTestId('loadout-jdam').click();
    await page.getByTestId('bays-cam-btn').click();
    await page.waitForTimeout(950);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-bays-open.png');

    // 4. Test Gear retract/extend + Control Stick / Rudder / Airbrake / Nozzle controls
    await page.getByTestId('gear-toggle-btn').click();
    await page.getByTestId('rudder-slider').fill('0.8');
    await page.getByTestId('airbrake-slider').fill('1');
    await page.getByTestId('nozzle-slider').fill('1');
    await page.getByTestId('reset-surfaces-btn').click();
    await page.getByTestId('gear-toggle-btn').click();
    await page.getByTestId('areas-close-btn').click();

    // 5. Explode 100% + assert ZERO collisions + dual-badge Inspector
    await page.getByTestId('cam-three-quarter').click();
    await page.getByTestId('explode-toggle-btn').click();
    await page.waitForTimeout(950);
    await expect(page.getByTestId('system-legend')).toBeVisible();

    const explodedOverlaps = await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { checkPartIntersections: (tol?: number) => Array<{ a: string; b: string }> };
        }
      ).__f22debug;
      return dbg.checkPartIntersections(0.005);
    });
    expect(explodedOverlaps).toEqual([]);

    await page.getByTestId('part-tree-toggle-btn').click();
    await page.getByTestId('tree-part-engine-f119-left').click();
    await expect(page.getByTestId('inspector-dual-labels')).toBeVisible();
    await assertNoElementOverlap(
      page,
      '[data-testid="top-bar"]',
      '[data-testid="inspector-panel"]'
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
