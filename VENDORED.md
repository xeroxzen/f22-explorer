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
| `src/sim/config/registry.ts` | `src/sim/config/registry.ts` | Stripped Falcon 9 constants; added `APPROXIMATE` label and F-22 categories; populated Phase 1–4 F-22 airframe, store, and F119 engine-start/spool constants; preserved `renderConstantsRegistryMarkdown()`. |
| `tests/constants-registry.test.ts` | `tests/constants-registry.test.ts` | Adapted assertions to F-22 registry; preserved provenance validation, `docs/ASSUMPTIONS.md` sync test, unlabeled constant check, and TypeScript AST magic-literal guard over `src/sim/**` (excluding `registry.ts`). |
| `src/content/schema.ts` | `src/content/schema.ts` | Extended `SpecStatus` with `APPROXIMATE` and `NOT_PUBLICLY_DISCLOSED`; added dual labels, `verbatim` quote guard, `modelingNotes`, `interaction`, and `validatePartsHierarchy()`. |
| `src/content/registry.ts` | `src/content/registry.ts` | Replaced Falcon 9 imports with the 45 Phase 1 F-22 part JSON files and hierarchy helpers. |
| `tests/content-schema.test.ts` | `tests/content-schema.test.ts` | Added schema, 30–50 part count, hierarchy cycle/parent integrity, `verbatim` quote enforcement, and `NOT_PUBLICLY_DISCLOSED` assertions over `src/content/parts/*.json`. |
| `src/ui/InspectorPanel.tsx` | `src/ui/InspectorPanel.tsx` | Removed Falcon 9 live rocket telemetry; renders part/area summary, dual provenance badges, specs, and sources (quoting snippets only when `verbatim: true`) inside desktop panel or mobile `BottomSheet`. |
| `src/audio/acoustics.ts` | `src/audio/acoustics.ts` | Removed US76 upper-atmosphere/vacuum/deluge/Doppler rocket logic; kept distance attenuation, atmospheric LPF absorption, interior cockpit muffling, registry speed of sound, and added Phase 4 APU whine. |
| `src/audio/soundEngine.ts` | `src/audio/soundEngine.ts` | Renamed to `ExplorerSoundEngine`; stripped rocket one-shots; kept deterministic noise buffers, muted-by-default Web Audio graph, smooth gain ramping, and debug state. |
| `tests/acoustics.test.ts` | `tests/acoustics.test.ts` | Adapted unit tests for hangar/run-up-pad distance attenuation, LPF absorption, interior muffling, APU whine, and muted-by-default sound engine state. |
| `src/ui/useViewport.ts` | `src/ui/useViewport.ts` | Copied verbatim. |
| `src/ui/BottomSheet.tsx` | `src/ui/BottomSheet.tsx` | Switched store import from `simStore` to `explorerStore`; otherwise verbatim. |
| `src/store/explorerStore.ts` | `src/store/simStore.ts` | Extracted UI/quality/sound state and extended with Phase 2–4 disassembly, area controls, and twin-F119 engine simulation state. |
| `tests/mobile-layout.test.ts` | `tests/mobile-layout.test.ts` | Adapted quality preset assertions to `explorerStore.ts` (`antialias` instead of `starCount`). |
| `src/scene/debugBridge.ts` | `src/scene/debugBridge.ts` | Renamed debug handle to `window.__f22debug`; kept FPS/frame-time ring buffer, hitbox registration, screen-space bounds projection, SAT collision check, and Phase 4 engine state hooks. |
| `e2e/helpers.ts` | `e2e/helpers.ts` | Adapted `waitForExplorerReady()` for `window.__f22debug`; kept screenshot and viewport occlusion/overlap helpers. |


## Third-Party 3D Assets & Environments (v1.1+)

| Local Asset | Upstream Source | Author | License | Accessed | Modifications |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `public/models/f22-raptor-nlm.glb` | [F22 Raptor FREE (Sketchfab)](https://sketchfab.com/3d-models/f22-raptor-free-2a64abf0866a405c865466c7642ca689) | NLM (`@NLM-Group`) | **CC-BY 4.0** (`creativecommons.org/licenses/by/4.0/`, verified via direct page fetch) | `2026-11-25` | Converted via committed `scripts/blender/split_f22_mesh.py`: removed boarding ladder, normalized to 18.92 m length (nose `-Z`, ground `Y=0`), decimated tires, split into 33 explorer part IDs, replaced textures with trademark-free PBR materials, Draco-compressed (381 KB). |
| `public/hdri/hangar_1k.hdr` | [Aircraft Workshop 01 (Poly Haven)](https://polyhaven.com/a/aircraft_workshop_01) | Poly Haven | **CC0 1.0** | `2026-11-25` | Used unmodified as indoor hangar IBL environment map (`1k` HDR). |
| `public/hdri/airfield_overcast_1k.hdr` | [Kloofendal 48d Partly Cloudy PureSky (Poly Haven)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) | Poly Haven | **CC0 1.0** | `2026-11-25` | Used unmodified as outdoor run-up pad IBL environment map (`1k` HDR). |
| `public/draco/*` | Three.js `examples/jsm/libs/draco/gltf/` | Google / Three.js | Apache-2.0 / MIT | `2026-11-25` | Bundled locally for offline/CI Draco glTF decoding. |
