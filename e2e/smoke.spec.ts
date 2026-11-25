import { expect, test } from '@playwright/test';
import {
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('v1.3 VLM Airflow Mode, Streamlines, Aileron Roll, Mach Cutoff & Regression Checks', () => {
  test('verifies Airflow mode (AoA sweep, aileron roll, streamlines/vortices, Mach>0.70 cutoff) + v1.1/v1.2 invariants', async ({
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
    expect(state.registeredHitboxes.length).toBe(70);

    const defaultDesktopTier: 'med' | 'high' = process.env.CI ? 'med' : 'high';
    await page.evaluate((tier) => {
      const dbg = (
        window as unknown as { __f22debug: { setQualityTier: (t: 'low' | 'med' | 'high') => void } }
      ).__f22debug;
      dbg.setQualityTier(tier);
    }, defaultDesktopTier);

    // 1. Open Airflow mode: verify Model Limits panel, live VLM coefficients & 2D charts
    await expect(page.getByTestId('mode-airflow')).toBeVisible();
    await page.getByTestId('mode-airflow').click();
    await expect(page.getByTestId('mode-panel-airflow')).toBeVisible();
    await expect(page.getByTestId('airflow-limits-panel')).toBeVisible();
    await expect(page.getByTestId('vlm-coeffs-panel')).toBeVisible();
    await expect(page.getByTestId('spanwise-lift-chart')).toBeVisible();
    await expect(page.getByTestId('aoa-sweep-chart')).toBeVisible();

    // Wait for initial VLM Web Worker solve (alpha = 8 deg -> CL > 0.15)
    await expect
      .poll(async () => Number(await page.getByTestId('vlm-cl').innerText()), { timeout: 10_000 })
      .toBeGreaterThan(0.15);

    await page.waitForTimeout(700);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.3/desktop-airflow-aoa-sweep.png');

    // 2. Aileron roll case: drag stick right -> asymmetric ΔCp & lift ribbon + positive roll moment C_l > 0
    const stick = page.getByTestId('control-stick-pad');
    await stick.scrollIntoViewIfNeeded();
    const sBox = await stick.boundingBox();
    expect(sBox).not.toBeNull();
    await page.mouse.click(sBox!.x + sBox!.width * 0.9, sBox!.y + sBox!.height * 0.5);

    await expect
      .poll(async () => Number(await page.getByTestId('vlm-croll').innerText()), { timeout: 8_000 })
      .toBeGreaterThan(0.01);
    await page.getByTestId('vlm-coeffs-panel').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.3/desktop-airflow-aileron-roll.png');

    // 3. Streamlines with wingtip vortices from rear 3/4 view at higher AoA (14 deg) + Polhamus toggle
    await page.getByTestId('polhamus-toggle-btn').scrollIntoViewIfNeeded();
    await page.getByTestId('polhamus-toggle-btn').click();
    await page.getByTestId('aero-alpha-slider').fill('14');
    await page.evaluate(() => {
      const dbg = (window as unknown as { __f22debug: { setCameraPreset: (p: string) => void } }).__f22debug;
      dbg.setCameraPreset('rear');
    });
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.3/desktop-airflow-streamlines-vortices.png');

    // 4. Prandtl-Glauert validity cutoff above Mach 0.70 -> warning banner appears, no extrapolation
    await page.getByTestId('aero-mach-slider').fill('0.76');
    await expect(page.getByTestId('vlm-validity-warning')).toBeVisible();
    await page.getByTestId('vlm-validity-warning').scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.3/desktop-airflow-mach-limit.png');

    // 5. Carry-over regression check: mil plume opacity <= 0.1 across all quality tiers
    await page.getByTestId('mode-engines').click();
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { setEnginePreset: (p: string) => void; setCameraPreset: (p: string) => void };
        }
      ).__f22debug;
      dbg.setEnginePreset('mil');
      dbg.setCameraPreset('rear');
    });
    await page.waitForTimeout(450);
    for (const tier of ['low', 'med', 'high'] as const) {
      await page.evaluate((t) => {
        const dbg = (
          window as unknown as { __f22debug: { setQualityTier: (x: 'low' | 'med' | 'high') => void } }
        ).__f22debug;
        dbg.setQualityTier(t);
      }, tier);
      await page.waitForTimeout(140);
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
        expect(m.transparent).toBe(true);
        expect(m.opacity).toBeLessThanOrEqual(0.1);
      }
      if (tier === 'low') expect(meshes.length).toBe(0);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
