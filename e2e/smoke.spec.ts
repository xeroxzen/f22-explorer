import { expect, test } from '@playwright/test';
import {
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('Phase 5 Desktop Guided Tours, Deep Links, Plume Realism & Precision', () => {
  test('verifies HIGH-locked screenshots, mil opacity <= 0.1 across all tiers, rectangular AB plume, tours & deep link', async ({
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

    // Lock quality to HIGH for desktop screenshot capture (disables adaptive step-down)
    await page.evaluate(() => {
      const dbg = (
        window as unknown as { __f22debug: { setQualityTier: (t: 'low' | 'med' | 'high') => void } }
      ).__f22debug;
      dbg.setQualityTier('high');
    });

    // 1. Anatomy tour — step 1 screenshot + Next + Skip + Resume check
    await page.getByTestId('tours-toggle-btn').click();
    await expect(page.getByTestId('tour-picker')).toBeVisible();
    await page.getByTestId('start-tour-anatomy').click();
    await expect(page.getByTestId('tour-card')).toBeVisible();
    await expect(page.getByTestId('tour-citation')).toBeVisible();
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-tour-anatomy.png');

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
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-tour-cockpit.png');

    // 3. Engine Start tour — step 1 screenshot (runs real state machine)
    await page.getByTestId('tour-switcher').selectOption('engine-start');
    await expect(page.getByTestId('tour-card')).toHaveAttribute('data-tour-id', 'engine-start');
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-tour-engine.png');
    await page.getByTestId('tour-skip-btn').click();

    // 4. Mil power: assert plume mesh opacity <= 0.1 at EVERY quality tier (low, med, high)
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

    for (const tier of ['low', 'med', 'high'] as const) {
      await page.evaluate((t) => {
        const dbg = (
          window as unknown as { __f22debug: { setQualityTier: (x: 'low' | 'med' | 'high') => void } }
        ).__f22debug;
        dbg.setQualityTier(t);
      }, tier);
      await page.waitForTimeout(180);
      const meshes = await page.evaluate(() => {
        const dbg = (
          window as unknown as {
            __f22debug: {
              getPlumeMeshOpacities: () => Array<{ transparent: boolean; opacity: number }>;
            };
          }
        ).__f22debug;
        return dbg.getPlumeMeshOpacities();
      });
      for (const m of meshes) {
        expect(m.transparent, `Mil plume mesh at ${tier} must be transparent`).toBe(true);
        expect(
          m.opacity,
          `Mil plume mesh opacity at ${tier} must be <= 0.1`
        ).toBeLessThanOrEqual(0.1);
      }
      if (tier === 'low') {
        expect(meshes.length).toBe(0);
      }
    }

    const milHudText = await page.getByTestId('hud-eng1-thrust').innerText();
    expect(milHudText).toMatch(/^~\d[\d,]* lbf \(~\d+(?:\.\d)? kN\)$/);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-mil-shimmer.png');

    // 5. Afterburner plume (locked at HIGH: rectangular exit relaxing to round, discrete shock diamonds)
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
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-ab-plume-new.png');

    // 6. Shareable Deep Link restoring Cockpit view + selected part + AB live MFD (locked at HIGH)
    await page.goto('/?cam=cockpit&part=cockpit-displays-hud&engine=ab');
    await waitForExplorerReady(page, false);
    await page.evaluate(() => {
      const dbg = (
        window as unknown as { __f22debug: { setQualityTier: (t: 'low' | 'med' | 'high') => void } }
      ).__f22debug;
      dbg.setQualityTier('high');
    });
    await expect(page.getByTestId('inspector-panel')).toBeVisible();
    await expect(page.getByTestId('inspector-panel')).toHaveAttribute(
      'data-component-id',
      'cockpit-displays-hud'
    );
    await page.waitForTimeout(900);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-deeplink-cockpit.png');

    // Keyboard Escape closes Inspector
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inspector-panel')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
