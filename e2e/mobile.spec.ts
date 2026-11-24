import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('Phase 4 Mobile Engine Start, Run-Up Pad & Bottom Sheet', () => {
  test('runs engines on outdoor run-up pad with mobile bottom sheet and HUD cleanly', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');
    expect(state.registeredHitboxes.length).toBe(44);

    // Open Engines mobile bottom sheet, jump to AB on outdoor pad, rear view
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
    await page.getByTestId('engines-toggle-btn').click();
    await expect(page.getByTestId('engines-panel')).toBeVisible();
    await page.waitForTimeout(850);

    await savePhaseScreenshot(
      page,
      `docs/screenshots/phase4/mobile-${testInfo.project.name}-ab.png`
    );

    // Close sheet -> compact HUD becomes visible cleanly on mobile
    await page.getByTestId('sheet-close-btn').click();
    await expect(page.getByTestId('engines-panel')).toHaveCount(0);
    await expect(page.getByTestId('engine-hud-overlay')).toBeVisible();

    await page.getByTestId('immersive-toggle-btn').click();
    await expect(page.getByTestId('top-bar')).toHaveCount(0);
    await expect(page.getByTestId('immersive-restore-btn')).toBeVisible();

    await page.getByTestId('immersive-restore-btn').click();
    await expect(page.getByTestId('top-bar')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
