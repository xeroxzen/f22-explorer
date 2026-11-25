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

Every `SOURCED`, `APPROXIMATE`, `CALIBRATED`, `EMPIRICAL`, `ASSUMED`, and `HEURISTIC` constant in `src/sim/` (90 entries) is defined in `src/sim/config/registry.ts` and rendered here automatically.

### Physical & Atmosphere

| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |
| --- | --- | --- | --- | --- | --- |
| `G0` | `9.80665 m/s^2` | `SOURCED` | — | `v0.1.0` | CGPM 1901 / ISO 80000-3 standard gravity |
| `SEA_LEVEL_DENSITY_KG_M3` | `1.225 kg/m^3` | `SOURCED` | — | `v0.1.0` | ICAO / US Standard Atmosphere 1976 sea-level air density (15 °C, 101.325 kPa) |
| `SEA_LEVEL_SPEED_OF_SOUND_MS` | `340.294 m/s` | `SOURCED` | — | `v0.1.0` | ICAO / US Standard Atmosphere 1976 sea-level speed of sound (15 °C) |
| `LBF_TO_KN` | `0.0044482216 kN/lbf` | `SOURCED` | — | `phase4` | NIST SP 811 exact unit conversion (1 lbf = 4.4482216 N) |
| `AIR_GAMMA_COLD` | `1.4` | `SOURCED` | — | `v1.2-thermal` | Standard diatomic dry air specific heat ratio (gamma_c = 1.4) for ISA compression & stagnation heating |
| `AIR_CP_COLD_J_KG_K` | `1,005 J/(kg*K)` | `SOURCED` | — | `v1.2-thermal` | Standard dry air specific heat at constant pressure (c_p,c = 1005 J/(kg·K)) |
| `ISA_SEA_LEVEL_TEMP_K` | `288.15 K` | `SOURCED` | — | `v1.2-thermal` | ISO 2533 / ICAO International Standard Atmosphere sea-level static temperature (15 °C) |
| `ISA_SEA_LEVEL_PRESSURE_PA` | `101,325 Pa` | `SOURCED` | — | `v1.2-thermal` | ISO 2533 / ICAO International Standard Atmosphere sea-level static pressure |
| `ISA_TROPOSPHERE_LAPSE_K_M` | `0.0065 K/m` | `SOURCED` | — | `v1.2-thermal` | ISO 2533 / ICAO ISA tropospheric temperature lapse rate (0–11 km) |
| `ISA_TROPOPAUSE_ALT_M` | `11,000 m` | `SOURCED` | — | `v1.2-thermal` | ISO 2533 / ICAO ISA tropopause geopotential altitude (11 km) |
| `ISA_TROPOPAUSE_TEMP_K` | `216.65 K` | `SOURCED` | — | `v1.2-thermal` | ISO 2533 / ICAO ISA isothermal lower stratosphere temperature (11–20 km, -56.5 °C) |
| `KELVIN_OFFSET` | `273.15 K` | `SOURCED` | — | `v1.2-thermal` | Exact SI offset between Kelvin and degrees Celsius |
| `ISA_STRATOSPHERE_CEILING_M` | `20,000 m` | `SOURCED` | — | `v1.2-thermal` | ISO 2533 / ICAO ISA upper ceiling of isothermal lower stratosphere band (20 km) |

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
| `F119_BYPASS_RATIO_APPROX` | `0.3` | `APPROXIMATE` | — | `phase1` | Jane's / public academic low-bypass turbofan reference (~0.3:1) |
| `F119_NOZZLE_VECTOR_MAX_DEG` | `20 deg` | `SOURCED` | — | `phase1` | Pratt & Whitney F119 public specification (±20° 2D pitch thrust vectoring) |
| `F119_AB_THRUST_CLASS_LBF` | `35,000 lbf` | `SOURCED` | — | `phase4` | USAF F-22 Fact Sheet & Pratt & Whitney public 35,000-pound thrust class per engine *(uncertainty: 35,000-lbf class; exact static thrust not publicly disclosed)* |
| `F119_DRY_THRUST_FRACTION` | `0.68` | `APPROXIMATE` | — | `phase4` | Dry military thrust fraction (~23,800 lbf / 106 kN ÷ 35,000 lbf class) |
| `F119_IDLE_THRUST_FRACTION` | `0.05` | `ASSUMED` | — | `phase4` | Teaching ground-idle residual thrust (~5% of rated class) |
| `ENGINE_IDLE_N2_PCT` | `62 %` | `ASSUMED` | — | `phase4` | Teaching ground-idle core spool speed; real F119 schedule not publicly disclosed |
| `ENGINE_MIL_N2_PCT` | `100 %` | `ASSUMED` | — | `phase4` | Normalized 100% N2 core speed at military dry power (generic gauge) |
| `ENGINE_MIL_THROTTLE_THRESHOLD` | `0.75` | `ASSUMED` | — | `phase4` | Throttle lever detent: 0..0.75 = Idle to Military (dry); >0.75..1.0 = Afterburner |
| `ENGINE_SPOOL_UP_TAU_S` | `2.2 s` | `ASSUMED` | — | `phase4` | First-order lag time constant for core spool acceleration (teaching model) |
| `ENGINE_SPOOL_DOWN_TAU_S` | `3.6 s` | `ASSUMED` | — | `phase4` | First-order lag time constant for core spool deceleration (teaching model) |
| `ENGINE_AB_TAU_S` | `0.85 s` | `ASSUMED` | — | `phase4` | First-order lag time constant for afterburner staging and nozzle expansion |
| `ENGINE_NOZZLE_IDLE_OPEN_FRAC` | `0.25` | `ASSUMED` | — | `phase4` | Convergent-divergent 2D nozzle exit area fraction at ground idle |
| `ENGINE_NOZZLE_MIL_OPEN_FRAC` | `0.55` | `ASSUMED` | — | `phase4` | Convergent-divergent 2D nozzle exit area fraction at military dry power |
| `ENGINE_NOZZLE_AB_OPEN_FRAC` | `1` | `ASSUMED` | — | `phase4` | Convergent-divergent 2D nozzle exit area fraction at maximum afterburner |
| `START_BATTERY_DURATION_S` | `1.5 s` | `ASSUMED` | — | `phase4` | Simulated battery bus power-up step duration (teaching sequence) |
| `START_APU_DURATION_S` | `3 s` | `ASSUMED` | — | `phase4` | Simulated APU spool-up step duration (teaching sequence) |
| `START_MOTOR_DURATION_S` | `2.5 s` | `ASSUMED` | — | `phase4` | Simulated AMAD accessory-gearbox motoring step duration (teaching sequence) |
| `START_IGNITION_DURATION_S` | `1.5 s` | `ASSUMED` | — | `phase4` | Simulated igniter & fuel-introduction step duration (teaching sequence) |
| `START_LIGHTOFF_DURATION_S` | `3.5 s` | `ASSUMED` | — | `phase4` | Simulated light-off to ground-idle spool step duration (teaching sequence) |
| `START_MOTOR_N2_PCT` | `22 %` | `ASSUMED` | — | `phase4` | Target N2% driven by APU via accessory gearbox prior to ignition |
| `SHUTDOWN_COOLDOWN_TAU_S` | `4 s` | `ASSUMED` | — | `phase4` | Spool-down time constant after fuel cutoff / abort |
| `ENGINE_AB_ON_THRESHOLD` | `0.05` | `ASSUMED` | — | `phase4` | Minimum normalized afterburner fraction to indicate AB lit |
| `ENGINE_MIL_REGIME_THRESHOLD` | `0.1` | `ASSUMED` | — | `phase4` | Minimum normalized dry spool above idle to indicate MIL regime |
| `ENGINE_SHUTDOWN_N2_CUTOFF_PCT` | `1.5 %` | `ASSUMED` | — | `phase4` | Core spool threshold below which SHUTDOWN transitions back to OFF |
| `ENGINE_APU_SPOOL_TAU_S` | `1.35 s` | `ASSUMED` | — | `phase4` | First-order lag time constant for Honeywell G-250 APU spool-up |
| `GAS_GAMMA_HOT` | `1.33` | `SOURCED` | — | `v1.2-thermal` | Textbook gas-turbine hot-section combustion products specific heat ratio (gamma_h = 1.33) |
| `GAS_CP_HOT_J_KG_K` | `1,150 J/(kg*K)` | `SOURCED` | — | `v1.2-thermal` | Textbook gas-turbine hot-section specific heat at constant pressure (c_p,h = 1150 J/(kg·K)) |
| `BRAYTON_FAN_PR_IDLE` | `1.5` | `ASSUMED` | — | `v1.2-thermal` | Assumed idle fan pressure ratio for teaching Brayton cycle (F119 cycle not publicly disclosed) |
| `BRAYTON_FAN_PR_MIL` | `4` | `ASSUMED` | — | `v1.2-thermal` | Assumed mil/max 3-stage fan pressure ratio for teaching Brayton cycle (F119 cycle not publicly disclosed) |
| `BRAYTON_HPC_PR_IDLE` | `3.2` | `ASSUMED` | — | `v1.2-thermal` | Assumed idle 6-stage HPC pressure ratio for teaching Brayton cycle (F119 cycle not publicly disclosed) |
| `BRAYTON_HPC_PR_MIL` | `7.5` | `ASSUMED` | — | `v1.2-thermal` | Assumed mil/max 6-stage HPC pressure ratio (~30:1 OPR; F119 cycle not publicly disclosed) |
| `BRAYTON_TIT_IDLE_K` | `1,050 K` | `ASSUMED` | — | `v1.2-thermal` | Assumed idle combustor exit / turbine inlet temperature (F119 cycle not publicly disclosed) |
| `BRAYTON_TIT_MIL_K` | `1,850 K` | `ASSUMED` | — | `v1.2-thermal` | Assumed mil/max combustor exit / turbine inlet temperature (F119 cycle not publicly disclosed) |
| `BRAYTON_AB_TEMP_MAX_K` | `2,150 K` | `ASSUMED` | — | `v1.2-thermal` | Assumed maximum afterburner exit total temperature (F119 cycle not publicly disclosed) |
| `BRAYTON_ETA_FAN` | `0.89` | `ASSUMED` | — | `v1.2-thermal` | Textbook axial fan isentropic efficiency for teaching Brayton cycle (F119 cycle not publicly disclosed) |
| `BRAYTON_ETA_HPC` | `0.87` | `ASSUMED` | — | `v1.2-thermal` | Textbook high-pressure compressor isentropic efficiency (F119 cycle not publicly disclosed) |
| `BRAYTON_ETA_HPT` | `0.9` | `ASSUMED` | — | `v1.2-thermal` | Textbook high-pressure turbine isentropic efficiency (F119 cycle not publicly disclosed) |
| `BRAYTON_ETA_LPT` | `0.91` | `ASSUMED` | — | `v1.2-thermal` | Textbook low-pressure turbine isentropic efficiency (F119 cycle not publicly disclosed) |
| `BRAYTON_ETA_NOZZLE` | `0.97` | `ASSUMED` | — | `v1.2-thermal` | Textbook convergent-divergent nozzle total pressure recovery (F119 cycle not publicly disclosed) |
| `BRAYTON_COMBUSTOR_DP_FRAC` | `0.04` | `ASSUMED` | — | `v1.2-thermal` | Textbook annular combustor fractional total pressure drop (F119 cycle not publicly disclosed) |
| `BRAYTON_AB_DP_FRAC` | `0.05` | `ASSUMED` | — | `v1.2-thermal` | Textbook afterburner fractional total pressure loss when lit (F119 cycle not publicly disclosed) |
| `BRAYTON_UNLIT_PR_FRAC` | `0.25` | `ASSUMED` | — | `v1.2-thermal` | Motoring compression fraction before light-off for smooth Brayton start transition |
| `BRAYTON_MIN_TURBINE_TERM` | `0.05` | `HEURISTIC` | — | `v1.2-thermal` | Numerical guard keeping turbine pressure-ratio base strictly positive |
| `JET_FUEL_LHV_J_KG` | `4.3200e+7 J/kg` | `ASSUMED` | — | `v1.2-thermal` | Assumed JP-8 / Jet A-1 lower heating value (~43.2 MJ/kg textbook teaching value for Brayton first-law check) |

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
| `AIM9_LENGTH_M` | `3.02 m` | `SOURCED` | — | `phase5` | NAVAIR AIM-9X Sidewinder product page (9.9 ft / 3.02 m) for side bay clearance check |
| `GBU32_LENGTH_M` | `3.04 m` | `SOURCED` | — | `phase4` | USAF Joint Direct Attack Munition (GBU-31/32/38) Fact Sheet: GBU-32 length 119.5 in (3.04 m) |
| `GBU39_LENGTH_M` | `1.8 m` | `SOURCED` | — | `phase4` | USAF GBU-39B Small Diameter Bomb Fact Sheet: length 70.8 in (1.80 m) |
| `GBU39_PER_RACK` | `4` | `SOURCED` | — | `phase4` | USAF GBU-39B Small Diameter Bomb Fact Sheet: 4 bombs per BRU-61/A carriage rack |
| `GBU39_RACKS_IN_MAIN_BAY` | `2` | `SOURCED` | — | `phase4` | USAF F-22 Raptor Fact Sheet: up to 8 Small Diameter Bombs (2 BRU-61/A racks × 4) |
| `F22_CANOPY_OPEN_DEG` | `38 deg` | `ASSUMED` | — | `phase1` | Visual proportion from USAF ramp photos; exact canopy hinge angle not published |
| `F22_M61A2_AMMO_ROUNDS` | `480 rounds` | `SOURCED` | — | `phase1` | USAF F-22 Fact Sheet & Air & Space Forces Magazine (20 mm M61A2 internal cannon) |

<!-- END GENERATED: CONSTANTS_REGISTRY -->
