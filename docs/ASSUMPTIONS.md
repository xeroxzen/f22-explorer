# F-22 Raptor Interactive Explorer — Assumptions & Constants

Every numeric constant used in the pure-TypeScript simulation and model layer (`src/sim/`) is registered in [`src/sim/config/registry.ts`](../src/sim/config/registry.ts) with an explicit provenance label:

- **`SOURCED`** — Publicly disclosed specification from a cited authoritative source (e.g., USAF fact sheet, manufacturer public material, ICAO/ISO standard).
- **`APPROXIMATE`** — Educational estimate bounded by a publicly disclosed class or range (e.g., thrust class).
- **`ASSUMED`** — Engineering assumption required for an interactive teaching model where real values are not publicly disclosed.
- **`CALIBRATED` / `EMPIRICAL` / `HEURISTIC`** — Fitted or rule-based model parameters with documented rationale.

Classified specifications (such as exact RCS, avionics internals, and detailed engine performance maps) are **never fabricated** and are marked `Not publicly disclosed` in content JSON files.

---

<!-- BEGIN GENERATED: CONSTANTS_REGISTRY -->
<!-- Auto-generated from src/sim/config/registry.ts via `pnpm docs:assumptions`. Do not edit by hand. -->

## Constants Registry (Single Source of Truth)

Every `SOURCED`, `APPROXIMATE`, `CALIBRATED`, `EMPIRICAL`, `ASSUMED`, and `HEURISTIC` constant in `src/sim/` (3 entries) is defined in `src/sim/config/registry.ts` and rendered here automatically.

### Physical & Atmosphere

| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |
| --- | --- | --- | --- | --- | --- |
| `G0` | `9.80665 m/s^2` | `SOURCED` | — | `phase0` | CGPM 1901 / ISO 80000-3 standard gravity |
| `SEA_LEVEL_DENSITY_KG_M3` | `1.225 kg/m^3` | `SOURCED` | — | `phase0` | ICAO / US Standard Atmosphere 1976 sea-level air density (15 °C, 101.325 kPa) |
| `SEA_LEVEL_SPEED_OF_SOUND_MS` | `340.294 m/s` | `SOURCED` | — | `phase0` | ICAO / US Standard Atmosphere 1976 sea-level speed of sound (15 °C) |

<!-- END GENERATED: CONSTANTS_REGISTRY -->
