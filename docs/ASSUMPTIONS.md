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

Every `SOURCED`, `APPROXIMATE`, `CALIBRATED`, `EMPIRICAL`, `ASSUMED`, and `HEURISTIC` constant in `src/sim/` (36 entries) is defined in `src/sim/config/registry.ts` and rendered here automatically.

### Physical & Atmosphere

| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |
| --- | --- | --- | --- | --- | --- |
| `G0` | `9.80665 m/s^2` | `SOURCED` | — | `v0.1.0` | CGPM 1901 / ISO 80000-3 standard gravity |
| `SEA_LEVEL_DENSITY_KG_M3` | `1.225 kg/m^3` | `SOURCED` | — | `v0.1.0` | ICAO / US Standard Atmosphere 1976 sea-level air density (15 °C, 101.325 kPa) |
| `SEA_LEVEL_SPEED_OF_SOUND_MS` | `340.294 m/s` | `SOURCED` | — | `v0.1.0` | ICAO / US Standard Atmosphere 1976 sea-level speed of sound (15 °C) |

### Airframe & Dimensions

| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |
| --- | --- | --- | --- | --- | --- |
| `F22_LENGTH_M` | `18.92 m` | `SOURCED` | — | `phase1` | USAF F-22 Raptor Fact Sheet & Lockheed Martin (62 ft 1 in = 18.923 m) |
| `F22_WINGSPAN_M` | `13.56 m` | `SOURCED` | — | `phase1` | USAF F-22 Raptor Fact Sheet & Lockheed Martin (44 ft 6 in) |
| `F22_HEIGHT_M` | `5.08 m` | `SOURCED` | — | `phase1` | USAF F-22 Raptor Fact Sheet & Lockheed Martin (16 ft 8 in) |
| `F22_WING_AREA_M2` | `78.04 m^2` | `SOURCED` | — | `phase1` | Wikipedia F-22A Specifications (citing Jay Miller, Aerofax 2005) & DVIDS (840 sq ft) |
| `F22_WING_LE_SWEEP_DEG` | `42 deg` | `SOURCED` | — | `phase1` | Wikipedia F-22A Specifications (citing Jay Miller, Aerofax 2005): 42° leading-edge sweep |
| `F22_WING_TE_SWEEP_DEG` | `-17 deg` | `APPROXIMATE` | — | `phase1` | Forward trailing-edge sweep measured from public 3-view planform alignment |
| `F22_VTAIL_CANT_DEG` | `28 deg` | `SOURCED` | — | `phase1` | Wikipedia F-22A Specifications (citing Jay Miller, Aerofax 2005): 28° outward tail cant |
| `F22_WING_ROOT_CHORD_CL_M` | `9.85 m` | `APPROXIMATE` | — | `phase1` | Trapezoidal centerline root chord derived to match 78.04 m² wing area with 42° LE and -17° TE sweep |
| `F22_WING_TIP_CHORD_M` | `1.67 m` | `APPROXIMATE` | — | `phase1` | Wingtip chord consistent with 9.85 m centerline chord, 6.78 m half-span, 42° LE and -17° TE sweep |
| `F22_WING_ROOT_X_M` | `1.85 m` | `APPROXIMATE` | — | `phase1` | Fuselage-to-wing junction lateral station from public 3-view proportions |
| `F22_VTAIL_ROOT_X_M` | `1.45 m` | `APPROXIMATE` | — | `phase1` | Vertical stabilizer root lateral offset from public 3-view proportions |
| `F22_VTAIL_ROOT_Y_M` | `2.45 m` | `APPROXIMATE` | — | `phase1` | Vertical stabilizer root height above ground plane from public side-profile proportions |
| `F22_VTAIL_TIP_X_M` | `2.85 m` | `APPROXIMATE` | — | `phase1` | Vertical stabilizer tip lateral station: rootX + (5.08 - 2.45) * tan(28°) = 2.85 m |
| `F22_VTAIL_TIP_Y_M` | `5.08 m` | `SOURCED` | — | `phase1` | USAF F-22 Raptor Fact Sheet overall aircraft height (16 ft 8 in) |
| `F22_EMPTY_WEIGHT_KG` | `19,700 kg` | `SOURCED` | — | `phase1` | USAF F-22 Raptor Fact Sheet (43,340 lb) |
| `F22_MTOW_KG` | `38,000 kg` | `SOURCED` | — | `phase1` | USAF F-22 Raptor Fact Sheet (83,500 lb) |
| `F22_INTERNAL_FUEL_KG` | `8,200 kg` | `SOURCED` | — | `phase1` | USAF F-22 Raptor Fact Sheet (18,000 lb internal fuel) |

### Propulsion & Engine Model

| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |
| --- | --- | --- | --- | --- | --- |
| `F119_ENGINE_COUNT` | `2` | `SOURCED` | — | `phase1` | USAF F-22 Fact Sheet & Pratt & Whitney (twin F119-PW-100) |
| `F119_AB_THRUST_CLASS_KN` | `156 kN` | `APPROXIMATE` | — | `phase1` | USAF Fact Sheet & Pratt & Whitney public 35,000+ lbf afterburning thrust class per engine *(uncertainty: 35,000+ lbf class; exact static thrust not publicly disclosed)* |
| `F119_DRY_THRUST_CLASS_KN` | `107 kN` | `APPROXIMATE` | — | `phase1` | Public aerospace reference range (~22,000–26,000 lbf / 98–116 kN dry military thrust) *(uncertainty: ±9 kN public estimate range)* |
| `F119_BYPASS_RATIO_APPROX` | `0.3` | `APPROXIMATE` | — | `phase1` | Jane's / public academic low-bypass turbofan reference (~0.3:1) |
| `F119_NOZZLE_VECTOR_MAX_DEG` | `20 deg` | `SOURCED` | — | `phase1` | Pratt & Whitney F119 public specification (±20° 2D pitch thrust vectoring) |

### Control Surfaces & Gear

| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |
| --- | --- | --- | --- | --- | --- |
| `F22_GEAR_TRACK_M` | `3.23 m` | `APPROXIMATE` | — | `phase1` | Secondary aerospace reference (10 ft 7 in main gear track) |
| `F22_GEAR_WHEELBASE_M` | `6.4 m` | `ASSUMED` | — | `phase1` | Proportioned from public side-view (FS 4.30 m nose to FS 10.70 m main) |
| `F22_STABILATOR_MAX_DEG` | `25 deg` | `ASSUMED` | — | `phase1` | Educational animation range; exact DoD flight-control limit is not publicly disclosed |
| `F22_AILERON_MAX_DEG` | `25 deg` | `ASSUMED` | — | `phase1` | Educational animation range; exact DoD flight-control limit is not publicly disclosed |
| `F22_FLAPERON_RANGE_DEG` | `[-20, 30] deg` | `ASSUMED` | — | `phase1` | Educational animation range [-20° up, +30° down]; exact DoD limit is not publicly disclosed |
| `F22_LEF_MAX_DEG` | `30 deg` | `ASSUMED` | — | `phase1` | Educational animation range (0° to +30° down); exact DoD limit is not publicly disclosed |
| `F22_RUDDER_MAX_DEG` | `30 deg` | `ASSUMED` | — | `phase1` | Educational animation range (±30° yaw / split airbrake); exact DoD limit is not publicly disclosed |

### Weapons Bays & Cockpit

| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |
| --- | --- | --- | --- | --- | --- |
| `AIM120_LENGTH_M` | `3.66 m` | `SOURCED` | — | `phase1` | USAF AIM-120 AMRAAM Fact Sheet (12 ft / 3.66 m) for main bay clearance check |
| `AIM9_LENGTH_M` | `3.02 m` | `SOURCED` | — | `phase1` | USAF AIM-9 Sidewinder Fact Sheet (9 ft 11 in / 3.02 m) for side bay clearance check |
| `F22_CANOPY_OPEN_DEG` | `38 deg` | `ASSUMED` | — | `phase1` | Visual proportion from USAF ramp photos; exact canopy hinge angle not published |
| `F22_M61A2_AMMO_ROUNDS` | `480 rounds` | `SOURCED` | — | `phase1` | USAF F-22 Fact Sheet & Air & Space Forces Magazine (20 mm M61A2 internal cannon) |

<!-- END GENERATED: CONSTANTS_REGISTRY -->
