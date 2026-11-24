import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('Phase 5 Mobile Engine Sheet (Running) & Performance', () => {
  test('pins throttle at top and collapses start steps to 1-line summary when RUNNING on mobile', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');
    expect(state.registeredHitboxes.length).toBe(44);

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

    await page.getByTestId('engines-toggle-btn').click();
    await expect(page.getByTestId('engines-panel')).toBeVisible();
    // Verify throttle is pinned at top & step list is collapsed to 1-line summary
    await expect(page.getByTestId('throttle-section')).toBeVisible();
    await expect(page.getByTestId('engine-steps-collapsed-summary')).toBeVisible();
    await page.waitForTimeout(850);

    await savePhaseScreenshot(
      page,
      `docs/screenshots/phase5/mobile-${testInfo.project.name}-engine-running.png`
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
      `[Phase 5 Perf Mobile LOW ${testInfo.project.name} (headless SwiftShader)]`,
      JSON.stringify(perf)
    );

    // Close sheet -> compact HUD becomes visible
    await page.getByTestId('sheet-close-btn').click();
    await expect(page.getByTestId('engines-panel')).toHaveCount(0);
    await expect(page.getByTestId('engine-hud-overlay')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
