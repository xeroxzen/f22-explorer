import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('v1.3 Mobile Airflow Mode (VLM) & 5-Tab Bottom Mode Bar', () => {
  test('verifies mobile Airflow tab, model limits, live VLM coefficients & streamlines', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');
    expect(state.registeredHitboxes.length).toBe(70);

    await expect(page.getByTestId('mobile-mode-bar')).toBeVisible();
    await expect(page.getByTestId('mobile-mode-airflow')).toBeVisible();

    await page.getByTestId('mobile-mode-airflow').click();
    await expect(page.getByTestId('mode-panel-airflow')).toBeVisible();
    await expect(page.getByTestId('airflow-limits-panel')).toBeVisible();
    await expect(page.getByTestId('vlm-coeffs-panel')).toBeVisible();

    await expect
      .poll(async () => Number(await page.getByTestId('vlm-cl').innerText()), { timeout: 10_000 })
      .toBeGreaterThan(0.15);

    await page.waitForTimeout(800);
    await savePhaseScreenshot(
      page,
      `docs/screenshots/v1.3/mobile-${testInfo.project.name}-airflow.png`
    );

    expect(pageErrors).toEqual([]);
  });
});
