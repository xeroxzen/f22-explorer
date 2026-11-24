import { expect, test } from '@playwright/test';
import {
  assertNoElementOverlap,
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('Phase 0 Desktop Empty Hangar Smoke', () => {
  test('renders empty hangar scene, inspector, quality tiers, and muted audio with zero console errors', async ({
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

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(800);
    expect(box!.height).toBeGreaterThan(500);

    // Quality tier switching works
    await page.getByTestId('quality-low').click();
    await expect(page.getByTestId('quality-low')).toHaveClass(/active/);
    await page.getByTestId('quality-high').click();

    // Open inspector & ensure top bar does not overlap inspector
    await page.getByTestId('inspector-toggle-btn').click();
    await expect(page.getByTestId('inspector-panel')).toBeVisible();
    await expect(page.getByTestId('inspector-empty')).toBeVisible();
    await assertNoElementOverlap(
      page,
      '[data-testid="top-bar"]',
      '[data-testid="inspector-panel"]'
    );

    await savePhaseScreenshot(page, 'docs/screenshots/phase0/desktop-hangar-inspector.png');

    await page.getByTestId('inspector-close-btn').click();
    await expect(page.getByTestId('inspector-panel')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
