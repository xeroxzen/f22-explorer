import { expect, test } from '@playwright/test';
import {
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('Phase 5 Desktop Guided Tours, Deep Links, Plume Realism & Precision', () => {
  test('verifies all 3 tours (skippable/resumable), new AB/Mil plumes, 2-sig-fig HUD, and cockpit deep link', async ({
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

    // 1. Anatomy tour — step 1 screenshot + Next + Skip + Resume check
    await page.getByTestId('tours-toggle-btn').click();
    await expect(page.getByTestId('tour-picker')).toBeVisible();
    await page.getByTestId('start-tour-anatomy').click();
    await expect(page.getByTestId('tour-card')).toBeVisible();
    await expect(page.getByTestId('tour-citation')).toBeVisible();
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/phase5/desktop-tour-anatomy.png');

    await page.getByTestId('tour-next-btn').click();
    await expect(page.getByTestId('tour-card')).toHaveAttribute('data-tour-step', '2');
    await page.getByTestId('tour-skip-btn').click();
    await expect(page.getByTestId('tour-card')).toHaveCount(0);

    // Verify Resume button appears at Step 2
    await page.getByTestId('tours-toggle-btn').click();
    await expect(page.getByTestId('resume-tour-anatomy')).toBeVisible();

    // 2. Cockpit tour — step 1 screenshot
    await page.getByTestId('start-tour-cockpit').click();
    await expect(page.getByTestId('tour-card')).toHaveAttribute('data-tour-id', 'cockpit');
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/phase5/desktop-tour-cockpit.png');

    // 3. Engine Start tour — step 1 screenshot (runs real state machine!)
    await page.getByTestId('tour-switcher').selectOption('engine-start');
    await expect(page.getByTestId('tour-card')).toHaveAttribute('data-tour-id', 'engine-start');
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/phase5/desktop-tour-engine.png');
    await page.getByTestId('tour-skip-btn').click();

    // 4. New Mil Power (heat shimmer ONLY, no opaque geometry) + 2-sig-fig HUD check
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: {
            setEnginePreset: (p: string) => void;
            setCameraPreset: (p: string) => void;
          };
        }
      ).__f22debug;
      dbg.setEnginePreset('mil');
      dbg.setCameraPreset('rear');
    });
    await page.waitForTimeout(850);
    const milHudText = await page.getByTestId('hud-eng1-thrust').innerText();
    expect(milHudText).toMatch(/^~\d[\d,]* lbf \(~\d+(?:\.\d)? kN\)$/);
    await savePhaseScreenshot(page, 'docs/screenshots/phase5/desktop-mil-shimmer.png');

    // 5. New Afterburner plume (rectangular exit, translucent flame, discrete fading shock diamonds)
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { setEnginePreset: (p: string) => void };
        }
      ).__f22debug;
      dbg.setEnginePreset('ab');
    });
    await page.waitForTimeout(600);
    const abHudText = await page.getByTestId('hud-eng1-thrust').innerText();
    expect(abHudText).toContain('~35,000 lbf');
    await savePhaseScreenshot(page, 'docs/screenshots/phase5/desktop-ab-plume-new.png');

    // Measure desktop HIGH perf metrics
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
    console.log('[Phase 5 Perf Desktop HIGH (headless SwiftShader)]', JSON.stringify(perf));

    // 6. Shareable Deep Link restoring Cockpit view + selected part + AB live MFD
    await page.goto('/?cam=cockpit&part=cockpit-displays-hud&engine=ab');
    await waitForExplorerReady(page, false);
    await expect(page.getByTestId('inspector-panel')).toBeVisible();
    await expect(page.getByTestId('inspector-panel')).toHaveAttribute(
      'data-component-id',
      'cockpit-displays-hud'
    );
    await page.waitForTimeout(900);
    await savePhaseScreenshot(page, 'docs/screenshots/phase5/desktop-deeplink-cockpit.png');

    // Keyboard Escape closes Inspector
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inspector-panel')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
