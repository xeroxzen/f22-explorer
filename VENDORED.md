# Vendored Modules Provenance

This repository (`f22-explorer`) was bootstrapped as a standalone project by copying selected infrastructure modules from **`falcon-9-simulator`** at tag **`v1.9.2`**, commit **`9de14bb7aa0c63cc47116c65f2abe6d81ef0ae38`** (`9de14bb`). No Falcon 9 physics, trajectory, or vehicle assets were copied.

Keep this table updated whenever any vendored file is modified.

| Local File | Upstream Source (`falcon-9-simulator` @ `9de14bb`) | Modifications |
| :--- | :--- | :--- |
| `AGENTS.md` | `AGENTS.md` | Adapted engineering principles for F-22 public-sources-only policy, parametric geometry, approximate engine teaching model, and `VENDORED.md` upkeep; preserved command hygiene and branch workflow rules. |
| `.github/workflows/ci.yml` | `.github/workflows/ci.yml` | Added `pnpm docs:assumptions --check`; updated headless Playwright command to run `e2e/smoke.spec.ts` and `e2e/mobile.spec.ts`. |
| `.github/workflows/deploy.yml` | `.github/workflows/deploy.yml` | Copied verbatim (dynamic `BASE_PATH="/${{ github.event.repository.name }}/"` GitHub Pages deploy). |
| `.gitignore` | `.gitignore` | Copied verbatim. |
| `package.json` | `package.json` | Renamed to `f22-explorer`; removed Falcon 9 CLI scripts (`sim:*`); preserved React/R3F/Three/Zustand/Vitest/Playwright dependency versions and core scripts. |
| `pnpm-workspace.yaml` | `pnpm-workspace.yaml` | Copied verbatim (`allowBuilds: { esbuild: true }` for pnpm 11). |
| `tsconfig.json` | `tsconfig.json` | Added `scripts/**/*.ts` to `include`; otherwise verbatim. |
| `vite.config.ts` | `vite.config.ts` | Extended `validateComponentsPlugin()` to recursively scan `src/content/**/*.json`. |
| `vitest.config.ts` | `vitest.config.ts` | Copied verbatim. |
| `playwright.config.ts` | `playwright.config.ts` | Kept `desktop`, `iphone-13`, `pixel-7`, SwiftShader headless flags, and `--reporter=list`; set `webServer` to port `5174` (`--strictPort`, `reuseExistingServer: false`) to avoid colliding with sibling dev servers on `5173`. |
| `scripts/generate-assumptions-tables.ts` | `scripts/generate-assumptions-tables.ts` | Copied verbatim. |
| `src/sim/config/registry.ts` | `src/sim/config/registry.ts` | Stripped Falcon 9 constants; added `APPROXIMATE` label and F-22 categories; seeded with universal physical constants (`G0`, `SEA_LEVEL_DENSITY_KG_M3`, `SEA_LEVEL_SPEED_OF_SOUND_MS`); preserved `renderConstantsRegistryMarkdown()`. |
| `tests/constants-registry.test.ts` | `tests/constants-registry.test.ts` | Adapted assertions to F-22 seed registry; preserved provenance validation, `docs/ASSUMPTIONS.md` sync test, unlabeled constant check, and TypeScript AST magic-literal guard over `src/sim/**` (excluding `registry.ts`). |
| `src/content/schema.ts` | `src/content/schema.ts` | Extended `SpecStatus` with `APPROXIMATE` and `NOT_PUBLICLY_DISCLOSED`; added optional `materials` string field. |
| `src/content/registry.ts` | `src/content/registry.ts` | Stripped Falcon 9 component JSON imports; ready for Phase 1 F-22 content JSON files. |
| `tests/content-schema.test.ts` | `tests/content-schema.test.ts` | Added schema unit tests for all 4 provenance statuses and recursive `src/content/**/*.json` validation. |
| `src/ui/InspectorPanel.tsx` | `src/ui/InspectorPanel.tsx` | Removed Falcon 9 live rocket telemetry; renders part/area summary, role, optional public materials, provenance-badged specs, and cited sources inside desktop panel or mobile `BottomSheet`. |
| `src/audio/acoustics.ts` | `src/audio/acoustics.ts` | Removed US76 upper-atmosphere/vacuum/deluge/Doppler rocket logic; kept distance attenuation, atmospheric LPF absorption, interior cockpit muffling, and registry speed of sound. |
| `src/audio/soundEngine.ts` | `src/audio/soundEngine.ts` | Renamed to `ExplorerSoundEngine`; stripped rocket one-shots (`clamp-release`, `meco`, `stage-sep`, `sonic-boom`); kept deterministic noise buffers, muted-by-default Web Audio graph, smooth gain ramping, and debug state. |
| `tests/acoustics.test.ts` | `tests/acoustics.test.ts` | Adapted unit tests for hangar distance attenuation, LPF absorption, interior muffling, and muted-by-default sound engine state. |
| `src/ui/useViewport.ts` | `src/ui/useViewport.ts` | Copied verbatim. |
| `src/ui/BottomSheet.tsx` | `src/ui/BottomSheet.tsx` | Switched store import from `simStore` to `explorerStore`; otherwise verbatim. |
| `src/store/explorerStore.ts` | `src/store/simStore.ts` | Extracted only `QualityTier`, `QUALITY_PRESETS`, `detectDefaultQualityTier()`, `soundMuted`, `selectedPartId`, `showInspector`, `bottomSheetHeightPx`, `rightDrawerWidthPx`, and `mobileControlsHidden` (immersive mode). |
| `tests/mobile-layout.test.ts` | `tests/mobile-layout.test.ts` | Adapted quality preset assertions to `explorerStore.ts` (`antialias` instead of `starCount`). |
| `src/scene/debugBridge.ts` | `src/scene/debugBridge.ts` | Renamed debug handle to `window.__f22debug`; removed rocket/Earth/pad hooks; kept FPS/frame-time ring buffer, hitbox registration, screen-space bounds projection, and added `checkPartIntersections()` stub for Phase 2+. |
| `e2e/helpers.ts` | `e2e/helpers.ts` | Adapted `waitForExplorerReady()` for `window.__f22debug`; kept screenshot and viewport occlusion/overlap helpers. |
