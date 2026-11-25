import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('v1.1 Mobile Bottom Mode Bar, Single Sheet & Engine Running Layout', () => {
  test('uses 4-tab bottom mode bar, single sheet, and pins throttle when RUNNING on mobile', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');
    expect(state.registeredHitboxes.length).toBe(70);

    // Verify 4-tab mobile bottom bar is visible and legacy floating explode dock is gone
    await expect(page.getByTestId('mobile-mode-bar')).toBeVisible();
    await expect(page.getByTestId('mobile-mode-explore')).toBeVisible();
    await expect(page.getByTestId('mobile-mode-engines')).toBeVisible();
    await expect(page.getByTestId('explode-dock')).toHaveCount(0);

    // Jump to steady-state RUNNING AB on outdoor run-up pad, rear view
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
    // Verify throttle is pinned at top, inline thrust HUD is present, & step list is collapsed to 1-line summary
    await expect(page.getByTestId('throttle-section')).toBeVisible();
    await expect(page.getByTestId('engine-inline-hud')).toBeVisible();
    await expect(page.getByTestId('engine-steps-collapsed-summary')).toBeVisible();
    await page.waitForTimeout(850);

    await savePhaseScreenshot(
      page,
      `docs/screenshots/v1.1/mobile-${testInfo.project.name}-engine-running.png`
    );

    const perf = await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: {
            getPerfMetrics: () => { fps: number; p50FrameMs: number; drawCalls: number; triangles: number };
          };
        }
      ).__f22debug;
      return dbg.getPerfMetrics();
    });
    console.log(
      `[v1.1 Perf Mobile LOW ${testInfo.project.name} (headless SwiftShader)]`,
      JSON.stringify(perf)
    );

    // Close sheet -> panel closes cleanly with no floating engine HUD overlap
    await page.getByTestId('sheet-close-btn').click();
    await expect(page.getByTestId('mode-panel-engines')).toHaveCount(0);
    await expect(page.getByTestId('engine-hud-overlay')).toHaveCount(0);

    expect(pageErrors).toEqual([]);
  });
});
