import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export interface ExplorerDebugState {
  sceneReady: boolean;
  qualityTier: 'low' | 'med' | 'high';
  soundMuted: boolean;
  selectedPartId: string | null;
  showInspector: boolean;
  bottomSheetHeightPx: number;
  rightDrawerWidthPx: number;
  mobileControlsHidden: boolean;
  registeredHitboxes: string[];
}

export async function waitForExplorerReady(page: Page): Promise<ExplorerDebugState> {
  await page.goto('/');
  await page.waitForFunction(
    () => {
      const dbg = (
        window as unknown as {
          __f22debug?: { getState: () => ExplorerDebugState };
        }
      ).__f22debug;
      return Boolean(dbg && dbg.getState().sceneReady);
    },
    { timeout: 30_000 }
  );
  // Let R3F render a couple of frames so canvas & controls settle
  await page.waitForTimeout(350);
  return page.evaluate(() => {
    const dbg = (
      window as unknown as { __f22debug: { getState: () => ExplorerDebugState } }
    ).__f22debug;
    return dbg.getState();
  });
}

export async function assertNoElementOverlap(
  page: Page,
  selectorA: string,
  selectorB: string
): Promise<void> {
  const boxA = await page.locator(selectorA).boundingBox();
  const boxB = await page.locator(selectorB).boundingBox();
  expect(boxA, `Missing element ${selectorA}`).not.toBeNull();
  expect(boxB, `Missing element ${selectorB}`).not.toBeNull();
  const a = boxA!;
  const b = boxB!;
  const overlaps =
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
  expect(
    overlaps,
    `Elements ${selectorA} and ${selectorB} unexpectedly overlap`
  ).toBe(false);
}

export async function savePhaseScreenshot(
  page: Page,
  relPath: string
): Promise<void> {
  const fullPath = path.resolve(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  await page.screenshot({ path: fullPath });
}
