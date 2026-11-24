import { expect, test } from '@playwright/test';
import { savePhaseScreenshot, waitForExplorerReady } from './helpers.js';

test.describe('Phase 2 Mobile Layout, Disassembly & Immersive Mode', () => {
  test('renders F-22 hangar, explode toggle, part tree/inspector sheets, and immersive UI', async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const state = await waitForExplorerReady(page);
    expect(state.sceneReady).toBe(true);
    expect(state.qualityTier).toBe('low');
    expect(state.registeredHitboxes.length).toBe(44);

    await expect(page.locator('canvas')).toBeVisible();
    await savePhaseScreenshot(
      page,
      `docs/screenshots/phase2/mobile-${testInfo.project.name}-assembled.png`
    );

    // Explode & open inspector via part tree
    await page.getByTestId('explode-toggle-btn').click();
    await page.waitForTimeout(800);
    await page.getByTestId('part-tree-toggle-btn').click();
    await expect(page.getByTestId('part-tree-panel')).toBeVisible();
    await page.getByTestId('tree-part-canopy').click();

    const sheet = page.getByTestId('inspector-panel');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('inspector-dual-labels')).toBeVisible();

    await savePhaseScreenshot(
      page,
      `docs/screenshots/phase2/mobile-${testInfo.project.name}-exploded-sheet.png`
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
