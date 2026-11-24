import { expect, test } from '@playwright/test';
import {
  assertNoElementOverlap,
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('Phase 4 Desktop F-22 Engine Start Sequence, Live Instruments & Afterburner', () => {
  test('runs full start -> idle -> mil -> AB -> cockpit AB MFD -> shutdown with 0 console errors', async ({
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

    // 1. Assert ZERO unintended part interpenetration in assembled state (explode = 0)
    const assembledOverlaps = await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { checkPartIntersections: (tol?: number) => Array<{ a: string; b: string }> };
        }
      ).__f22debug;
      return dbg.checkPartIntersections(0.005);
    });
    expect(assembledOverlaps).toEqual([]);

    // 2. Open Engine Control panel & kick off real start sequence (moves jet to outdoor run-up pad)
    await page.getByTestId('engines-toggle-btn').click();
    await expect(page.getByTestId('engines-panel')).toBeVisible();
    await expect(page.getByTestId('engine-step-list')).toBeVisible();
    await page.getByTestId('cam-rear').click();
    await page.getByTestId('start-engines-btn').click();

    // Advance the real state machine to mid-start (~13 s into start sequence: Eng 1 idle, Eng 2 motoring)
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { tickEngineSim: (dt: number) => void };
        }
      ).__f22debug;
      for (let i = 0; i < 130; i++) dbg.tickEngineSim(0.1);
    });
    await page.waitForTimeout(850);
    await expect(page.getByTestId('engine-hud-overlay')).toBeVisible();
    await savePhaseScreenshot(page, 'docs/screenshots/phase4/desktop-start-midway.png');

    // 3. Finish start sequence -> Both Engines at Idle
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { tickEngineSim: (dt: number) => void };
        }
      ).__f22debug;
      for (let i = 0; i < 160; i++) dbg.tickEngineSim(0.1);
    });
    await page.waitForTimeout(350);
    await expect(page.getByTestId('throttle-mil-btn')).toBeEnabled();
    await savePhaseScreenshot(page, 'docs/screenshots/phase4/desktop-idle.png');

    // 4. Advance throttle to Military Dry Power (75%)
    await page.getByTestId('throttle-mil-btn').click();
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { tickEngineSim: (dt: number) => void };
        }
      ).__f22debug;
      for (let i = 0; i < 90; i++) dbg.tickEngineSim(0.1);
    });
    await page.waitForTimeout(350);
    await savePhaseScreenshot(page, 'docs/screenshots/phase4/desktop-mil.png');

    // 5. Advance throttle to Max Afterburner (100%) -> shock diamonds + expanded 2D nozzles
    await page.getByTestId('throttle-ab-btn').click();
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { tickEngineSim: (dt: number) => void };
        }
      ).__f22debug;
      for (let i = 0; i < 60; i++) dbg.tickEngineSim(0.1);
    });
    await page.waitForTimeout(450);

    const abState = await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: {
            getState: () => {
              enginePhase: string;
              engineOutdoors: boolean;
              leftThrustLbf: number;
              afterburnerOn: boolean;
            };
          };
        }
      ).__f22debug;
      return dbg.getState();
    });
    expect(abState.enginePhase).toBe('RUNNING');
    expect(abState.engineOutdoors).toBe(true);
    expect(abState.afterburnerOn).toBe(true);
    expect(abState.leftThrustLbf).toBeGreaterThan(30_000);
    expect(abState.leftThrustLbf).toBeLessThanOrEqual(35_000);
    await savePhaseScreenshot(page, 'docs/screenshots/phase4/desktop-ab-diamonds.png');

    // 6. Switch to Cockpit view during AB (verify all 6 Code One LCDs + live Engine MFD showing AB ON)
    await page.getByTestId('engine-cockpit-cam-btn').click();
    await page.getByTestId('engines-close-btn').click();
    await page.waitForTimeout(950);
    await savePhaseScreenshot(page, 'docs/screenshots/phase4/desktop-cockpit-ab.png');

    // 7. Shutdown back to OFF (returns to indoor hangar)
    await page.getByTestId('engines-toggle-btn').click();
    await page.getByTestId('shutdown-engines-btn').click();
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { tickEngineSim: (dt: number) => void };
        }
      ).__f22debug;
      for (let i = 0; i < 250; i++) dbg.tickEngineSim(0.1);
    });
    await page.waitForTimeout(250);

    const offState = await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { getState: () => { enginePhase: string; engineOutdoors: boolean } };
        }
      ).__f22debug;
      return dbg.getState();
    });
    expect(offState.enginePhase).toBe('OFF');
    expect(offState.engineOutdoors).toBe(false);

    await assertNoElementOverlap(
      page,
      '[data-testid="top-bar"]',
      '[data-testid="engines-panel"]'
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
