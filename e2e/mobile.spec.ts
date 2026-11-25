import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('v1.2 Mobile Staged Cutaway, Thermal Panel & Engine Running Layout', () => {
  test('verifies mobile Engines thermal cutaway, skin heating panel & pinned throttle', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');
    expect(state.registeredHitboxes.length).toBe(70);

    await expect(page.getByTestId('mobile-mode-bar')).toBeVisible();

    // Jump to AB + open Engines sheet + activate F119 Thermal Cutaway
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: {
            setCameraPreset: (p: string) => void;
            setEnginePreset: (p: string) => void;
          };
        }
      ).__f22debug;
      dbg.setEnginePreset('ab');
      dbg.setCameraPreset('rear');
    });

    await page.getByTestId('mobile-mode-engines').click();
    await expect(page.getByTestId('mode-panel-engines')).toBeVisible();
    await expect(page.getByTestId('throttle-section')).toBeVisible();
    await expect(page.getByTestId('engine-inline-hud')).toBeVisible();
    await expect(page.getByTestId('engine-steps-collapsed-summary')).toBeVisible();
    await expect(page.getByTestId('thermal-cycle-panel')).toBeVisible();
    await expect(page.getByTestId('skin-heating-panel')).toBeVisible();

    await page.getByTestId('f119-cutaway-btn').click();
    await page.waitForTimeout(850);

    await savePhaseScreenshot(
      page,
      `docs/screenshots/v1.2/mobile-${testInfo.project.name}-thermal.png`
    );

    expect(pageErrors).toEqual([]);
  });
});
