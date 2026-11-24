import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('Phase 3 Mobile Layout, Bottom-Sheet Camera Fit & Areas', () => {
  test('renders mobile exploded view fitted above bottom sheet and areas controls cleanly', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');
    expect(state.registeredHitboxes.length).toBe(44);

    // Explode & open inspector via part tree (verifying mobile bottom-sheet camera fit)
    await page.getByTestId('explode-toggle-btn').click();
    await page.waitForTimeout(850);
    await page.getByTestId('part-tree-toggle-btn').click();
    await expect(page.getByTestId('part-tree-panel')).toBeVisible();
    await page.getByTestId('tree-part-canopy').click();

    const sheet = page.getByTestId('inspector-panel');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('inspector-dual-labels')).toBeVisible();
    await page.waitForTimeout(750);

    await savePhaseScreenshot(
      page,
      `docs/screenshots/phase3/mobile-${testInfo.project.name}-exploded-fit.png`
    );

    // Close sheet, open Areas & Stick mobile sheet, verify immersive toggle
    await page.getByTestId('sheet-close-btn').click();
    await expect(sheet).toHaveCount(0);

    await page.getByTestId('areas-toggle-btn').click();
    await expect(page.getByTestId('areas-panel')).toBeVisible();
    await page.getByTestId('sheet-close-btn').click();

    await page.getByTestId('immersive-toggle-btn').click();
    await expect(page.getByTestId('top-bar')).toHaveCount(0);
    await expect(page.getByTestId('immersive-restore-btn')).toBeVisible();

    await page.getByTestId('immersive-restore-btn').click();
    await expect(page.getByTestId('top-bar')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
