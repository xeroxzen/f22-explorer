import { expect, test } from '@playwright/test';
import {
  savePhaseScreenshot,
  waitForExplorerReady,
} from './helpers.js';

test.describe('v1.1 Desktop Mode UI, 70 Parts, Plume Gradient, Credits & Deep Links', () => {
  test('verifies mode switcher, panel overlap rule, 70 hitboxes, mil opacity <= 0.1, AB gradient plume, credits & deep link', async ({
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

    // Lock quality to HIGH for desktop screenshot capture (disables adaptive step-down)
    await page.evaluate(() => {
      const dbg = (
        window as unknown as { __f22debug: { setQualityTier: (t: 'low' | 'med' | 'high') => void } }
      ).__f22debug;
      dbg.setQualityTier('high');
    });

    // 1. Default Explore mode screenshot (blurred hangar HDRI + 70-part tree + 4-mode top bar)
    await expect(page.getByTestId('mode-explore')).toBeVisible();
    await expect(page.getByTestId('mode-cockpit')).toBeVisible();
    await expect(page.getByTestId('mode-weapons')).toBeVisible();
    await expect(page.getByTestId('mode-engines')).toBeVisible();
    await expect(page.getByTestId('mode-panel-explore')).toBeVisible();
    await page.waitForTimeout(700);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-explore-mode.png');

    // 2. Panel rule: select a new v1.1 part -> Inspector opens -> opening ⋯ Menu closes Inspector
    await page.getByTestId('part-tree-search').fill('APG-77');
    await page.getByTestId('tree-part-an-apg-77-radar').click();
    await expect(page.getByTestId('inspector-panel')).toBeVisible();
    await expect(page.getByTestId('inspector-panel')).toHaveAttribute(
      'data-component-id',
      'an-apg-77-radar'
    );

    await page.getByTestId('overflow-menu-btn').click();
    await expect(page.getByTestId('overflow-menu')).toBeVisible();
    await expect(page.getByTestId('credits-panel')).toBeVisible();
    await expect(page.getByTestId('credits-panel')).toContainText('CC-BY 4.0');
    await expect(page.getByTestId('credits-panel')).toContainText(
      'modified (split into parts, re-materialed)'
    );
    // Inspector must close when ⋯ Menu opens (zero menu-over-HUD overlap)
    await expect(page.getByTestId('inspector-panel')).toHaveCount(0);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-overflow-credits.png');

    // 3. Guided Tour launched from ⋯ Menu (Next -> Step 2 -> Skip -> Resume)
    await page.getByTestId('start-tour-anatomy').click();
    await expect(page.getByTestId('tour-card')).toBeVisible();
    await expect(page.getByTestId('tour-citation')).toBeVisible();
    await page.getByTestId('tour-next-btn').click();
    await expect(page.getByTestId('tour-card')).toHaveAttribute('data-tour-step', '2');
    await page.getByTestId('tour-skip-btn').click();
    await expect(page.getByTestId('tour-card')).toHaveCount(0);

    await page.getByTestId('overflow-menu-btn').click();
    await expect(page.getByTestId('resume-tour-anatomy')).toBeVisible();
    await page.getByTestId('overflow-menu-btn').click();

    // 4. Weapons mode: open main & side bays, verify >= 80% projected store bbox inside viewport for all 3 loadouts
    await page.getByTestId('mode-weapons').click();
    await expect(page.getByTestId('mode-panel-weapons')).toBeVisible();
    await page.getByTestId('main-bay-toggle-btn').click();
    await page.getByTestId('side-bays-toggle-btn').click();
    await page.getByTestId('bays-cam-btn').click();
    for (const loadout of ['air-to-air', 'jdam', 'sdb'] as const) {
      await page.getByTestId(`loadout-${loadout}`).click();
      await page.waitForTimeout(750);
      const cov = await page.evaluate(() => {
        const dbg = (
          window as unknown as {
            __f22debug: {
              getLoadedStoresViewportCoverage: () => {
                count: number;
                minCoverage: number;
                avgCoverage: number;
              };
            };
          }
        ).__f22debug;
        return dbg.getLoadedStoresViewportCoverage();
      });
      expect(cov.count, `Loadout ${loadout} must have loaded stores`).toBeGreaterThanOrEqual(6);
      expect(
        cov.minCoverage,
        `Loadout ${loadout} min store viewport coverage (${(cov.minCoverage * 100).toFixed(1)}%) must be >= 80%`
      ).toBeGreaterThanOrEqual(0.8);
    }
    await page.getByTestId('loadout-air-to-air').click();
    await page.waitForTimeout(650);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-weapons-bays.png');

    // 5. Engines mode: inline thrust readout inside Engines panel (no separate floating HUD)
    await page.getByTestId('mode-engines').click();
    await expect(page.getByTestId('mode-panel-engines')).toBeVisible();
    await expect(page.getByTestId('engine-inline-hud')).toBeVisible();
    await expect(page.getByTestId('engine-hud-overlay')).toHaveCount(0);

    // Mil power: assert plume mesh opacity <= 0.1 at EVERY quality tier (low, med, high)
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
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-engines-mil.png');

    // 6. Afterburner plume (locked at HIGH: sky HDRI + emissive blue-white->orange plume, core-only bloom)
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: { setEnginePreset: (p: string) => void };
        }
      ).__f22debug;
      dbg.setEnginePreset('ab');
    });
    await page.waitForTimeout(650);
    const abHudText = await page.getByTestId('hud-eng1-thrust').innerText();
    expect(abHudText).toContain('~35,000 lbf');
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-engines-ab.png');

    // 7. Exploded cutaway view showing F119 stages, fuel cells & AN/APG-77 radar
    await page.getByTestId('mode-explore').click();
    await page.evaluate(() => {
      const dbg = (
        window as unknown as {
          __f22debug: {
            setEnginePreset: (p: string) => void;
            setCameraPreset: (p: string) => void;
          };
        }
      ).__f22debug;
      dbg.setEnginePreset('off');
      dbg.setCameraPreset('three-quarter');
    });
    await page.getByTestId('explode-toggle-btn').click();
    await page.waitForTimeout(850);
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-exploded-cutaway.png');

    // 8. Shareable Deep Link restoring Cockpit mode + selected part + AB live MFD (locked at HIGH)
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
    await savePhaseScreenshot(page, 'docs/screenshots/v1.1/desktop-cockpit-deeplink.png');

    // Keyboard Escape closes Inspector
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inspector-panel')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
