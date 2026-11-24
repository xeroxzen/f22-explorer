# Agent Instructions — F-22 Raptor Interactive Explorer

## Non-Negotiable Engineering Principles
1. **Public sources only, honestly labeled.** Much of the F-22 is classified. Every specification, dimension, and system description MUST come from a cited public source (USAF fact sheet, manufacturer public material, reputable references) or be explicitly labeled `ASSUMED` or `APPROXIMATE` with reasoning in `src/sim/config/registry.ts`, `docs/ASSUMPTIONS.md`, and `src/content/**/*.json`. Never fabricate precise figures for classified areas (RCS, avionics internals, detailed engine maps); display `Not publicly disclosed` (`NOT_PUBLICLY_DISCLOSED`) instead.
2. **Own parametric geometry, zero IP risk.** All 3D geometry is procedurally/parametrically built from public proportions as separate part objects with known pivots and explode vectors. No downloaded/ripped meshes, no manufacturer logos or trademarks on the model.
3. **Simulation & engine model decoupled from rendering.** `src/sim/` is pure TypeScript with zero Three.js imports and must run headless in Node. All numeric constants live in `src/sim/config/registry.ts` (enforced by the AST magic-literal guard in `tests/constants-registry.test.ts`). Never loosen test thresholds to make tests pass; any threshold change requires its own commit with rationale.
4. **Honest educational instrumentation.** The engine start-up and power model is an approximate teaching model; internal parameters are labeled `ASSUMED`, and thrust readouts are labeled `APPROXIMATE` (public thrust class).
5. **Vendored code tracking.** Maintain `VENDORED.md` whenever any file copied from `falcon-9-simulator` is modified.

## Command Hygiene (Non-Negotiable)
- **No hanging or interactive commands:** Never run commands that wait for interactive input or run forever unless they are explicitly background servers.
- **Playwright:** Always use `--reporter=list` (or `['html', { open: 'never' }]` if HTML reporting is ever enabled). Never serve or auto-open the Playwright HTML report.
- **Vitest:** Always run `vitest run` (`pnpm test`), never watch mode.
- **Dev servers:** Start dev servers only via Playwright's `webServer` config (auto-shutdown), or explicitly kill them in the same task when done.
- **Long jobs:** Wrap any long-running script in a timeout with a sensible limit and log progress to a file.
- **Cleanup before finishing:** Before reporting a task done, verify no stray background processes or temporary git worktrees remain.

## Branching & Validation Hygiene (Non-Negotiable)
- **Feature branches only:** Work on one feature branch per phase (e.g., `feat/phase-0-bootstrap`), never push unreviewed work directly to `main` (pushing to `main` auto-deploys to GitHub Pages). Merge to `main` (merge commit, no squash) and tag releases only after explicit review.
- **Phase screenshots:** Capture desktop + mobile screenshots under `docs/screenshots/phaseN/` and stop for review after each phase.
- **Geometry & collision assertions (Phase 2+):** E2E tests must assert zero unintended part interpenetration in the assembled state and zero collisions along explode vectors.
