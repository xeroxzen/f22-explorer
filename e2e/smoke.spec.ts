import { expect, test } from '@playwright/test';
import {
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('v1.2 Staged Cutaway, Recognizable F119 Stages, Brayton Thermal Model & Skin Heating', () => {
  test('verifies assembled, 3-stage explode, F119 thermal cutaway (idle/mil/AB), Inspector T/P, skin heating & bays coverage', async ({
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

    // Lock quality to HIGH for crisp desktop screenshots
    const defaultDesktopTier: 'med' | 'high' = process.env.CI ? 'med' : 'high';
    await page.evaluate((tier) => {
      const dbg = (
        window as unknown as { __f22debug: { setQualityTier: (t: 'low' | 'med' | 'high') => void } }
      ).__f22debug;
      dbg.setQualityTier(tier);
    }, defaultDesktopTier);

    // 1. Assembled view (neutral metals, no system tints by default)
    await expect(page.getByTestId('mode-panel-explore')).toBeVisible();
    await expect(page.getByTestId('explode-stage-badge')).toHaveText('Assembled');
    await page.waitForTimeout(650);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-assembled.png');

    // 2. Staged Explode: Stage 1 (Skin) -> Stage 2 (Systems) -> Stage 3 (Engine)
    await page.getByTestId('explode-stage-1').click();
    await expect(page.getByTestId('explode-stage-badge')).toHaveText('Stage 1: Skin');
    await page.waitForTimeout(750);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-explode-stage1-skin.png');

    await page.getByTestId('explode-stage-2').click();
    await expect(page.getByTestId('explode-stage-badge')).toHaveText('Stage 2: Systems');
    await page.waitForTimeout(750);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-explode-stage2-systems.png');

    await page.getByTestId('explode-stage-3').click();
    await expect(page.getByTestId('explode-stage-badge')).toHaveText('Stage 3: Engine');
    await page.waitForTimeout(750);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-explode-stage3-engine.png');

    // Return to Assembled & verify Weapons Bays >= 80% store viewport coverage for all 3 loadouts
    await page.getByTestId('explode-stage-0').click();
    await page.getByTestId('mode-weapons').click();
    await page.getByTestId('main-bay-toggle-btn').click();
    await page.getByTestId('side-bays-toggle-btn').click();
    await page.getByTestId('bays-cam-btn').click();
    for (const loadout of ['air-to-air', 'jdam', 'sdb'] as const) {
      await page.getByTestId(`loadout-${loadout}`).click();
      await page.waitForTimeout(650);
      const cov = await page.evaluate(() => {
        const dbg = (
          window as unknown as {
            __f22debug: {
              getLoadedStoresViewportCoverage: () => { count: number; minCoverage: number };
            };
          }
        ).__f22debug;
        return dbg.getLoadedStoresViewportCoverage();
      });
      expect(cov.count).toBeGreaterThanOrEqual(6);
      expect(cov.minCoverage).toBeGreaterThanOrEqual(0.8);
    }

    // 3. Engines Mode: F119 Thermal Cutaway at Idle, Mil, and AB + Inspector Brayton Station T/P
    await page.getByTestId('mode-engines').click();
    await expect(page.getByTestId('thermal-cycle-panel')).toBeVisible();
    await expect(page.getByTestId('thermal-legend')).toBeVisible();
    await expect(page.getByTestId('skin-heating-panel')).toBeVisible();

    // Mil opacity <= 0.1 across all quality tiers before opening cutaway
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
    await page.waitForTimeout(550);
    for (const tier of ['low', 'med', 'high'] as const) {
      await page.evaluate((t) => {
        const dbg = (
          window as unknown as { __f22debug: { setQualityTier: (x: 'low' | 'med' | 'high') => void } }
        ).__f22debug;
        dbg.setQualityTier(t);
      }, tier);
      await page.waitForTimeout(150);
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

    // Activate F119 Thermal Cutaway (Stage 3 + rear camera) and inspect Combustor Stn 4
    await page.getByTestId('f119-cutaway-btn').click();
    await page.getByTestId('inspect-combustor-btn').click();
    await expect(page.getByTestId('inspector-panel')).toBeVisible();
    await expect(page.getByTestId('inspector-brayton-station')).toBeVisible();

    // Idle thermal cutaway
    await page.evaluate(() => {
      const dbg = (window as unknown as { __f22debug: { setEnginePreset: (p: string) => void } }).__f22debug;
      dbg.setEnginePreset('idle');
    });
    await page.waitForTimeout(700);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-f119-thermal-idle.png');

    // Mil thermal cutaway
    await page.evaluate(() => {
      const dbg = (window as unknown as { __f22debug: { setEnginePreset: (p: string) => void } }).__f22debug;
      dbg.setEnginePreset('mil');
    });
    await page.waitForTimeout(700);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-f119-thermal-mil.png');

    // AB thermal cutaway
    await page.evaluate(() => {
      const dbg = (window as unknown as { __f22debug: { setEnginePreset: (p: string) => void } }).__f22debug;
      dbg.setEnginePreset('ab');
    });
    await page.waitForTimeout(700);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-f119-thermal-ab.png');

    // 4. Skin Heating Panel scrolled into view at Mach 2.0 / 12 km ISA
    await page.getByTestId('inspector-close-btn').click();
    const skinPanel = page.getByTestId('skin-heating-panel');
    await skinPanel.scrollIntoViewIfNeeded();
    await page.getByTestId('skin-mach-slider').fill('2');
    await expect(page.getByTestId('skin-temp-readout')).toContainText('390 K');
    await page.waitForTimeout(400);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.2/desktop-skin-heating.png');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
