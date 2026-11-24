import { expect, test } from '@playwright/test';
import {
  assertNoElementOverlap,
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('Phase 3 Desktop F-22 Cockpit Rebuild, Weapons Bays Loadouts & Controls', () => {
  test('verifies zero collisions, cockpit 6-LCD + hotspot inspector, all 3 bay loadouts, gear & control stick', async ({
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

    // Capture Top view for direct comparison with v0.3.0
    await page.getByTestId('cam-top').click();
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-top.png');

    // 2. Cockpit seat-level view (6 bezeled LCDs, HUD, ICP, consoles, HOTAS, canopy bow)
    await page.getByTestId('areas-toggle-btn').click();
    await expect(page.getByTestId('areas-panel')).toBeVisible();
    await page.getByTestId('cockpit-cam-btn').click();
    await page.waitForTimeout(950);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-cockpit.png');

    // Click center Primary MFD hotspot -> opens Inspector with dual badges & sources
    await page.mouse.click(640, 460);
    await page.waitForTimeout(350);
    await expect(page.getByTestId('inspector-panel')).toBeVisible();
    await expect(page.getByTestId('inspector-dual-labels')).toBeVisible();
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-cockpit-hotspot.png');
    await page.getByTestId('inspector-close-btn').click();

    // 3. Open Main + Side Weapons Bays and capture ALL 3 USAF loadouts
    await page.getByTestId('bays-cam-btn').click();
    await page.waitForTimeout(950);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-bays-aim120.png');

    await page.getByTestId('loadout-jdam').click();
    await page.waitForTimeout(350);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-bays-jdam.png');

    await page.getByTestId('loadout-sdb').click();
    await page.waitForTimeout(350);
    await savePhaseScreenshot(page, 'docs/screenshots/phase3/desktop-bays-sdb.png');

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
