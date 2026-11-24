import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('Phase 0 Mobile Layout & Immersive Mode', () => {
  test('renders mobile bottom sheet and immersive toggle cleanly', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');

    await expect(page.locator('canvas')).toBeVisible();

    // Open inspector bottom sheet
    await page.getByTestId('inspector-toggle-btn').click();
    const sheet = page.getByTestId('inspector-panel');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveClass(/bottom-sheet/);

    await savePhaseScreenshot(
      page,
      `docs/screenshots/phase0/mobile-${testInfo.project.name}-sheet.png`
    );

    // Close sheet and verify immersive hide/restore UI
    await page.getByTestId('sheet-close-btn').click();
    await expect(sheet).toHaveCount(0);

    await page.getByTestId('immersive-toggle-btn').click();
    await expect(page.getByTestId('top-bar')).toHaveCount(0);
    await expect(page.getByTestId('immersive-restore-btn')).toBeVisible();

    await page.getByTestId('immersive-restore-btn').click();
    await expect(page.getByTestId('top-bar')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
