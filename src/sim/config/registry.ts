/**
 * Central Constants Registry (Single Source of Truth).
 *
 * Every SOURCED, APPROXIMATE, CALIBRATED, EMPIRICAL, ASSUMED, and HEURISTIC
 * constant used by the pure-TypeScript simulation/model core lives here with
 * full provenance:
 *   - value, unit, label, category
 *   - source or derivation
 *   - git commit or tag where the value was established/verified
 *
 * The tables in docs/ASSUMPTIONS.md are generated directly from this registry
 * (and verified in tests/constants-registry.test.ts) so docs cannot drift from code.
 */

export type ConstantLabel =
  | 'SOURCED'
  | 'APPROXIMATE'
  | 'CALIBRATED'
  | 'EMPIRICAL'
  | 'ASSUMED'
  | 'HEURISTIC'
  | 'COMPUTED';

export type ConstantCategory =
  | 'Physical & Atmosphere'
  | 'Airframe & Dimensions'
  | 'Propulsion & Engine Model'
  | 'Control Surfaces & Gear'
  | 'Weapons Bays & Cockpit'
  | 'Acoustics & Scene';

export type ConstantValue =
  | number
  | readonly number[]
  | readonly (readonly [number, number])[]
  | readonly (readonly [number, number, number])[];

export interface RegistryEntry<T extends ConstantValue = ConstantValue> {
  readonly id: string;
  readonly value: T;
  readonly unit: string;
  /** Canonical physical quantity identifier (must be unique across registry). */
  readonly quantity: string;
  readonly label: ConstantLabel;
  readonly category: ConstantCategory;
  readonly sourceOrDerivation: string;
  /** Reference datasets/sources used for calibration/fit, or empty when not calibrated. */
  readonly calibratedOn: readonly string[];
  /** Git commit hash or release tag where this value was established or last updated. */
  readonly commit: string;
  /** Optional uncertainty note for approximate or fitted values. */
  readonly uncertainty?: string;
}

function entry<T extends ConstantValue>(def: RegistryEntry<T>): RegistryEntry<T> {
  return def;
}

export const CONSTANTS_REGISTRY = {
  // =========================================================================
  // 1. Physical & Atmosphere
  // =========================================================================
  G0: entry({
    id: 'G0',
    value: 9.80665,
    quantity: 'physics.standard_gravity',
    unit: 'm/s^2',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'CGPM 1901 / ISO 80000-3 standard gravity',
    calibratedOn: [],
    commit: 'v0.1.0',
  }),
  SEA_LEVEL_DENSITY_KG_M3: entry({
    id: 'SEA_LEVEL_DENSITY_KG_M3',
    value: 1.225,
    quantity: 'sea.level.density',
    unit: 'kg/m^3',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ICAO / US Standard Atmosphere 1976 sea-level air density (15 °C, 101.325 kPa)',
    calibratedOn: [],
    commit: 'v0.1.0',
  }),
  SEA_LEVEL_SPEED_OF_SOUND_MS: entry({
    id: 'SEA_LEVEL_SPEED_OF_SOUND_MS',
    value: 340.294,
    quantity: 'sea.level.speed.of.sound',
    unit: 'm/s',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ICAO / US Standard Atmosphere 1976 sea-level speed of sound (15 °C)',
    calibratedOn: [],
    commit: 'v0.1.0',
  }),

  // =========================================================================
  // 2. Airframe & Dimensions
  // =========================================================================
  F22_LENGTH_M: entry({
    id: 'F22_LENGTH_M',
    value: 18.92,
    quantity: 'f22.length',
    unit: 'm',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet & Lockheed Martin (62 ft 1 in = 18.923 m)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WINGSPAN_M: entry({
    id: 'F22_WINGSPAN_M',
    value: 13.56,
    quantity: 'f22.wingspan',
    unit: 'm',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet & Lockheed Martin (44 ft 6 in)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_HEIGHT_M: entry({
    id: 'F22_HEIGHT_M',
    value: 5.08,
    quantity: 'f22.height',
    unit: 'm',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet & Lockheed Martin (16 ft 8 in)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_AREA_M2: entry({
    id: 'F22_WING_AREA_M2',
    value: 78.04,
    quantity: 'f22.wing.area',
    unit: 'm^2',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Wikipedia F-22A Specifications (citing Jay Miller, Aerofax 2005) & DVIDS (840 sq ft)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_LE_SWEEP_DEG: entry({
    id: 'F22_WING_LE_SWEEP_DEG',
    value: 42,
    quantity: 'f22.wing.le.sweep',
    unit: 'deg',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Wikipedia F-22A Specifications (citing Jay Miller, Aerofax 2005): 42° leading-edge sweep',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_TE_SWEEP_DEG: entry({
    id: 'F22_WING_TE_SWEEP_DEG',
    value: -17,
    quantity: 'f22.wing.te.sweep',
    unit: 'deg',
    label: 'APPROXIMATE',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Forward trailing-edge sweep measured from public 3-view planform alignment',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_VTAIL_CANT_DEG: entry({
    id: 'F22_VTAIL_CANT_DEG',
    value: 28,
    quantity: 'f22.vtail.cant',
    unit: 'deg',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Wikipedia F-22A Specifications (citing Jay Miller, Aerofax 2005): 28° outward tail cant',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_ROOT_CHORD_CL_M: entry({
    id: 'F22_WING_ROOT_CHORD_CL_M',
    value: 9.85,
    quantity: 'f22.wing.root.chord.cl',
    unit: 'm',
    label: 'APPROXIMATE',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Trapezoidal centerline root chord derived to match 78.04 m² wing area with 42° LE and -17° TE sweep',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_TIP_CHORD_M: entry({
    id: 'F22_WING_TIP_CHORD_M',
    value: 1.67,
    quantity: 'f22.wing.tip.chord',
    unit: 'm',
    label: 'APPROXIMATE',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Wingtip chord consistent with 9.85 m centerline chord, 6.78 m half-span, 42° LE and -17° TE sweep',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_ROOT_X_M: entry({
    id: 'F22_WING_ROOT_X_M',
    value: 1.85,
    quantity: 'f22.wing.root.x',
    unit: 'm',
    label: 'APPROXIMATE',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Fuselage-to-wing junction lateral station from public 3-view proportions',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_VTAIL_ROOT_X_M: entry({
    id: 'F22_VTAIL_ROOT_X_M',
    value: 1.45,
    quantity: 'f22.vtail.root.x',
    unit: 'm',
    label: 'APPROXIMATE',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Vertical stabilizer root lateral offset from public 3-view proportions',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_VTAIL_ROOT_Y_M: entry({
    id: 'F22_VTAIL_ROOT_Y_M',
    value: 2.45,
    quantity: 'f22.vtail.root.y',
    unit: 'm',
    label: 'APPROXIMATE',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Vertical stabilizer root height above ground plane from public side-profile proportions',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_VTAIL_TIP_X_M: entry({
    id: 'F22_VTAIL_TIP_X_M',
    value: 2.85,
    quantity: 'f22.vtail.tip.x',
    unit: 'm',
    label: 'APPROXIMATE',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Vertical stabilizer tip lateral station: rootX + (5.08 - 2.45) * tan(28°) = 2.85 m',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_VTAIL_TIP_Y_M: entry({
    id: 'F22_VTAIL_TIP_Y_M',
    value: 5.08,
    quantity: 'f22.vtail.tip.y',
    unit: 'm',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet overall aircraft height (16 ft 8 in)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  AIM120_LENGTH_M: entry({
    id: 'AIM120_LENGTH_M',
    value: 3.66,
    quantity: 'aim120.length',
    unit: 'm',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'USAF AIM-120 AMRAAM Fact Sheet (12 ft / 3.66 m) for main bay clearance check',
    calibratedOn: [],
    commit: 'phase1',
  }),
  AIM9_LENGTH_M: entry({
    id: 'AIM9_LENGTH_M',
    value: 3.02,
    quantity: 'aim9.length',
    unit: 'm',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'NAVAIR AIM-9X Sidewinder product page (9.9 ft / 3.02 m) for side bay clearance check',
    calibratedOn: [],
    commit: 'phase5',
  }),
  GBU32_LENGTH_M: entry({
    id: 'GBU32_LENGTH_M',
    value: 3.04,
    quantity: 'gbu32.length',
    unit: 'm',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'USAF Joint Direct Attack Munition (GBU-31/32/38) Fact Sheet: GBU-32 length 119.5 in (3.04 m)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  GBU39_LENGTH_M: entry({
    id: 'GBU39_LENGTH_M',
    value: 1.8,
    quantity: 'gbu39.length',
    unit: 'm',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'USAF GBU-39B Small Diameter Bomb Fact Sheet: length 70.8 in (1.80 m)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  GBU39_PER_RACK: entry({
    id: 'GBU39_PER_RACK',
    value: 4,
    quantity: 'gbu39.per.rack',
    unit: '1',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'USAF GBU-39B Small Diameter Bomb Fact Sheet: 4 bombs per BRU-61/A carriage rack',
    calibratedOn: [],
    commit: 'phase4',
  }),
  GBU39_RACKS_IN_MAIN_BAY: entry({
    id: 'GBU39_RACKS_IN_MAIN_BAY',
    value: 2,
    quantity: 'gbu39.racks.in.main.bay',
    unit: '1',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet: up to 8 Small Diameter Bombs (2 BRU-61/A racks × 4)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  F22_EMPTY_WEIGHT_KG: entry({
    id: 'F22_EMPTY_WEIGHT_KG',
    value: 19_700,
    quantity: 'f22.empty.weight',
    unit: 'kg',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet (43,340 lb)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_MTOW_KG: entry({
    id: 'F22_MTOW_KG',
    value: 38_000,
    quantity: 'f22.mtow',
    unit: 'kg',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet (83,500 lb)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_INTERNAL_FUEL_KG: entry({
    id: 'F22_INTERNAL_FUEL_KG',
    value: 8_200,
    quantity: 'f22.internal.fuel',
    unit: 'kg',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'USAF F-22 Raptor Fact Sheet (18,000 lb internal fuel)',
    calibratedOn: [],
    commit: 'phase1',
  }),

  // =========================================================================
  // 3. Propulsion & Engine Model (Public Class & Approximate Teaching Bounds)
  // =========================================================================
  F119_ENGINE_COUNT: entry({
    id: 'F119_ENGINE_COUNT',
    value: 2,
    quantity: 'f119.engine.count',
    unit: '1',
    label: 'SOURCED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'USAF F-22 Fact Sheet & Pratt & Whitney (twin F119-PW-100)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F119_BYPASS_RATIO_APPROX: entry({
    id: 'F119_BYPASS_RATIO_APPROX',
    value: 0.3,
    quantity: 'engine.bypass_ratio',
    unit: '1',
    label: 'APPROXIMATE',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Jane\'s / public academic low-bypass turbofan reference (~0.3:1)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F119_NOZZLE_VECTOR_MAX_DEG: entry({
    id: 'F119_NOZZLE_VECTOR_MAX_DEG',
    value: 20,
    quantity: 'f119.nozzle.vector.max',
    unit: 'deg',
    label: 'SOURCED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Pratt & Whitney F119 public specification (±20° 2D pitch thrust vectoring)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F119_AB_THRUST_CLASS_LBF: entry({
    id: 'F119_AB_THRUST_CLASS_LBF',
    value: 35_000,
    quantity: 'engine.ab_thrust_class',
    unit: 'lbf',
    label: 'SOURCED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'USAF F-22 Fact Sheet & Pratt & Whitney public 35,000-pound thrust class per engine',
    calibratedOn: [],
    commit: 'phase4',
    uncertainty: '35,000-lbf class; exact static thrust not publicly disclosed',
  }),
  LBF_TO_KN: entry({
    id: 'LBF_TO_KN',
    value: 0.0044482216,
    quantity: 'lbf.to',
    unit: 'kN/lbf',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'NIST SP 811 exact unit conversion (1 lbf = 4.4482216 N)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  F119_DRY_THRUST_FRACTION: entry({
    id: 'F119_DRY_THRUST_FRACTION',
    value: 0.68,
    quantity: 'f119.dry.thrust.fraction',
    unit: '1',
    label: 'APPROXIMATE',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Dry military thrust fraction (~23,800 lbf / 106 kN ÷ 35,000 lbf class)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  F119_IDLE_THRUST_FRACTION: entry({
    id: 'F119_IDLE_THRUST_FRACTION',
    value: 0.05,
    quantity: 'f119.idle.thrust.fraction',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Teaching ground-idle residual thrust (~5% of rated class)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_IDLE_N2_PCT: entry({
    id: 'ENGINE_IDLE_N2_PCT',
    value: 62,
    quantity: 'engine.idle.n2',
    unit: '%',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Teaching ground-idle core spool speed; real F119 schedule not publicly disclosed',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_MIL_N2_PCT: entry({
    id: 'ENGINE_MIL_N2_PCT',
    value: 100,
    quantity: 'engine.mil.n2',
    unit: '%',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Normalized 100% N2 core speed at military dry power (generic gauge)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_MIL_THROTTLE_THRESHOLD: entry({
    id: 'ENGINE_MIL_THROTTLE_THRESHOLD',
    value: 0.75,
    quantity: 'engine.mil.throttle.threshold',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Throttle lever detent: 0..0.75 = Idle to Military (dry); >0.75..1.0 = Afterburner',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_SPOOL_UP_TAU_S: entry({
    id: 'ENGINE_SPOOL_UP_TAU_S',
    value: 2.2,
    quantity: 'engine.spool.up.tau',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'First-order lag time constant for core spool acceleration (teaching model)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_SPOOL_DOWN_TAU_S: entry({
    id: 'ENGINE_SPOOL_DOWN_TAU_S',
    value: 3.6,
    quantity: 'engine.spool.down.tau',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'First-order lag time constant for core spool deceleration (teaching model)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_AB_TAU_S: entry({
    id: 'ENGINE_AB_TAU_S',
    value: 0.85,
    quantity: 'engine.ab.tau',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'First-order lag time constant for afterburner staging and nozzle expansion',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_NOZZLE_IDLE_OPEN_FRAC: entry({
    id: 'ENGINE_NOZZLE_IDLE_OPEN_FRAC',
    value: 0.25,
    quantity: 'engine.nozzle.idle.open.frac',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Convergent-divergent 2D nozzle exit area fraction at ground idle',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_NOZZLE_MIL_OPEN_FRAC: entry({
    id: 'ENGINE_NOZZLE_MIL_OPEN_FRAC',
    value: 0.55,
    quantity: 'engine.nozzle.mil.open.frac',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Convergent-divergent 2D nozzle exit area fraction at military dry power',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_NOZZLE_AB_OPEN_FRAC: entry({
    id: 'ENGINE_NOZZLE_AB_OPEN_FRAC',
    value: 1.0,
    quantity: 'engine.nozzle.ab.open.frac',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Convergent-divergent 2D nozzle exit area fraction at maximum afterburner',
    calibratedOn: [],
    commit: 'phase4',
  }),
  START_BATTERY_DURATION_S: entry({
    id: 'START_BATTERY_DURATION_S',
    value: 1.5,
    quantity: 'start.battery.duration',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Simulated battery bus power-up step duration (teaching sequence)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  START_APU_DURATION_S: entry({
    id: 'START_APU_DURATION_S',
    value: 3.0,
    quantity: 'start.apu.duration',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Simulated APU spool-up step duration (teaching sequence)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  START_MOTOR_DURATION_S: entry({
    id: 'START_MOTOR_DURATION_S',
    value: 2.5,
    quantity: 'start.motor.duration',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Simulated AMAD accessory-gearbox motoring step duration (teaching sequence)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  START_IGNITION_DURATION_S: entry({
    id: 'START_IGNITION_DURATION_S',
    value: 1.5,
    quantity: 'start.ignition.duration',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Simulated igniter & fuel-introduction step duration (teaching sequence)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  START_LIGHTOFF_DURATION_S: entry({
    id: 'START_LIGHTOFF_DURATION_S',
    value: 3.5,
    quantity: 'start.lightoff.duration',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Simulated light-off to ground-idle spool step duration (teaching sequence)',
    calibratedOn: [],
    commit: 'phase4',
  }),
  START_MOTOR_N2_PCT: entry({
    id: 'START_MOTOR_N2_PCT',
    value: 22,
    quantity: 'start.motor.n2',
    unit: '%',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Target N2% driven by APU via accessory gearbox prior to ignition',
    calibratedOn: [],
    commit: 'phase4',
  }),
  SHUTDOWN_COOLDOWN_TAU_S: entry({
    id: 'SHUTDOWN_COOLDOWN_TAU_S',
    value: 4.0,
    quantity: 'shutdown.cooldown.tau',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Spool-down time constant after fuel cutoff / abort',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_AB_ON_THRESHOLD: entry({
    id: 'ENGINE_AB_ON_THRESHOLD',
    value: 0.05,
    quantity: 'engine.ab.on.threshold',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Minimum normalized afterburner fraction to indicate AB lit',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_MIL_REGIME_THRESHOLD: entry({
    id: 'ENGINE_MIL_REGIME_THRESHOLD',
    value: 0.1,
    quantity: 'engine.mil.regime.threshold',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Minimum normalized dry spool above idle to indicate MIL regime',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_SHUTDOWN_N2_CUTOFF_PCT: entry({
    id: 'ENGINE_SHUTDOWN_N2_CUTOFF_PCT',
    value: 1.5,
    quantity: 'engine.shutdown.n2.cutoff',
    unit: '%',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Core spool threshold below which SHUTDOWN transitions back to OFF',
    calibratedOn: [],
    commit: 'phase4',
  }),
  ENGINE_APU_SPOOL_TAU_S: entry({
    id: 'ENGINE_APU_SPOOL_TAU_S',
    value: 1.35,
    quantity: 'engine.apu.spool.tau',
    unit: 's',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'First-order lag time constant for Honeywell G-250 APU spool-up',
    calibratedOn: [],
    commit: 'phase4',
  }),

  // =========================================================================
  // 4. Control Surfaces & Gear (Educational Ranges — DoD limits classified)
  // =========================================================================
  F22_GEAR_TRACK_M: entry({
    id: 'F22_GEAR_TRACK_M',
    value: 3.23,
    quantity: 'f22.gear.track',
    unit: 'm',
    label: 'APPROXIMATE',
    category: 'Control Surfaces & Gear',
    sourceOrDerivation: 'Secondary aerospace reference (10 ft 7 in main gear track)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_GEAR_WHEELBASE_M: entry({
    id: 'F22_GEAR_WHEELBASE_M',
    value: 6.4,
    quantity: 'f22.gear.wheelbase',
    unit: 'm',
    label: 'ASSUMED',
    category: 'Control Surfaces & Gear',
    sourceOrDerivation: 'Proportioned from public side-view (FS 4.30 m nose to FS 10.70 m main)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_STABILATOR_MAX_DEG: entry({
    id: 'F22_STABILATOR_MAX_DEG',
    value: 25,
    quantity: 'f22.stabilator.max',
    unit: 'deg',
    label: 'ASSUMED',
    category: 'Control Surfaces & Gear',
    sourceOrDerivation: 'Educational animation range; exact DoD flight-control limit is not publicly disclosed',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_AILERON_MAX_DEG: entry({
    id: 'F22_AILERON_MAX_DEG',
    value: 25,
    quantity: 'f22.aileron.max',
    unit: 'deg',
    label: 'ASSUMED',
    category: 'Control Surfaces & Gear',
    sourceOrDerivation: 'Educational animation range; exact DoD flight-control limit is not publicly disclosed',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_FLAPERON_RANGE_DEG: entry({
    id: 'F22_FLAPERON_RANGE_DEG',
    value: [-20, 30],
    quantity: 'f22.flaperon.range',
    unit: 'deg',
    label: 'ASSUMED',
    category: 'Control Surfaces & Gear',
    sourceOrDerivation: 'Educational animation range [-20° up, +30° down]; exact DoD limit is not publicly disclosed',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_LEF_MAX_DEG: entry({
    id: 'F22_LEF_MAX_DEG',
    value: 30,
    quantity: 'f22.lef.max',
    unit: 'deg',
    label: 'ASSUMED',
    category: 'Control Surfaces & Gear',
    sourceOrDerivation: 'Educational animation range (0° to +30° down); exact DoD limit is not publicly disclosed',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_RUDDER_MAX_DEG: entry({
    id: 'F22_RUDDER_MAX_DEG',
    value: 30,
    quantity: 'f22.rudder.max',
    unit: 'deg',
    label: 'ASSUMED',
    category: 'Control Surfaces & Gear',
    sourceOrDerivation: 'Educational animation range (±30° yaw / split airbrake); exact DoD limit is not publicly disclosed',
    calibratedOn: [],
    commit: 'phase1',
  }),

  // =========================================================================
  // 5. Weapons Bays & Cockpit
  // =========================================================================
  F22_CANOPY_OPEN_DEG: entry({
    id: 'F22_CANOPY_OPEN_DEG',
    value: 38,
    quantity: 'f22.canopy.open',
    unit: 'deg',
    label: 'ASSUMED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'Visual proportion from USAF ramp photos; exact canopy hinge angle not published',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_M61A2_AMMO_ROUNDS: entry({
    id: 'F22_M61A2_AMMO_ROUNDS',
    value: 480,
    quantity: 'f22.m61a2.ammo.rounds',
    unit: 'rounds',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'USAF F-22 Fact Sheet & Air & Space Forces Magazine (20 mm M61A2 internal cannon)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  AIR_GAMMA_COLD: entry({
    id: 'AIR_GAMMA_COLD',
    value: 1.4,
    quantity: 'air.gamma.cold',
    unit: '1',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'Standard diatomic dry air specific heat ratio (gamma_c = 1.4) for ISA compression & stagnation heating',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  AIR_CP_COLD_J_KG_K: entry({
    id: 'AIR_CP_COLD_J_KG_K',
    value: 1005,
    quantity: 'air.cp.cold',
    unit: 'J/(kg*K)',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'Standard dry air specific heat at constant pressure (c_p,c = 1005 J/(kg·K))',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  GAS_GAMMA_HOT: entry({
    id: 'GAS_GAMMA_HOT',
    value: 1.33,
    quantity: 'gas.gamma.hot',
    unit: '1',
    label: 'SOURCED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook gas-turbine hot-section combustion products specific heat ratio (gamma_h = 1.33)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  GAS_CP_HOT_J_KG_K: entry({
    id: 'GAS_CP_HOT_J_KG_K',
    value: 1150,
    quantity: 'gas.cp.hot',
    unit: 'J/(kg*K)',
    label: 'SOURCED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook gas-turbine hot-section specific heat at constant pressure (c_p,h = 1150 J/(kg·K))',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  ISA_SEA_LEVEL_TEMP_K: entry({
    id: 'ISA_SEA_LEVEL_TEMP_K',
    value: 288.15,
    quantity: 'isa.sea.level.temp',
    unit: 'K',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ISO 2533 / ICAO International Standard Atmosphere sea-level static temperature (15 °C)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  ISA_SEA_LEVEL_PRESSURE_PA: entry({
    id: 'ISA_SEA_LEVEL_PRESSURE_PA',
    value: 101_325,
    quantity: 'isa.sea.level.pressure',
    unit: 'Pa',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ISO 2533 / ICAO International Standard Atmosphere sea-level static pressure',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  ISA_TROPOSPHERE_LAPSE_K_M: entry({
    id: 'ISA_TROPOSPHERE_LAPSE_K_M',
    value: 0.0065,
    quantity: 'isa.troposphere.lapse',
    unit: 'K/m',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ISO 2533 / ICAO ISA tropospheric temperature lapse rate (0–11 km)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  ISA_TROPOPAUSE_ALT_M: entry({
    id: 'ISA_TROPOPAUSE_ALT_M',
    value: 11_000,
    quantity: 'isa.tropopause.alt',
    unit: 'm',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ISO 2533 / ICAO ISA tropopause geopotential altitude (11 km)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  ISA_TROPOPAUSE_TEMP_K: entry({
    id: 'ISA_TROPOPAUSE_TEMP_K',
    value: 216.65,
    quantity: 'isa.tropopause.temp',
    unit: 'K',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ISO 2533 / ICAO ISA isothermal lower stratosphere temperature (11–20 km, -56.5 °C)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  KELVIN_OFFSET: entry({
    id: 'KELVIN_OFFSET',
    value: 273.15,
    quantity: 'kelvin.offset',
    unit: 'K',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'Exact SI offset between Kelvin and degrees Celsius',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_FAN_PR_IDLE: entry({
    id: 'BRAYTON_FAN_PR_IDLE',
    value: 1.5,
    quantity: 'brayton.fan.pr.idle',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed idle fan pressure ratio for teaching Brayton cycle (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_FAN_PR_MIL: entry({
    id: 'BRAYTON_FAN_PR_MIL',
    value: 4.0,
    quantity: 'brayton.fan.pr.mil',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed mil/max 3-stage fan pressure ratio for teaching Brayton cycle (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_HPC_PR_IDLE: entry({
    id: 'BRAYTON_HPC_PR_IDLE',
    value: 3.2,
    quantity: 'brayton.hpc.pr.idle',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed idle 6-stage HPC pressure ratio for teaching Brayton cycle (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_HPC_PR_MIL: entry({
    id: 'BRAYTON_HPC_PR_MIL',
    value: 7.5,
    quantity: 'brayton.hpc.pr.mil',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed mil/max 6-stage HPC pressure ratio (~30:1 OPR; F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_TIT_IDLE_K: entry({
    id: 'BRAYTON_TIT_IDLE_K',
    value: 1050,
    quantity: 'brayton.tit.idle',
    unit: 'K',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed idle combustor exit / turbine inlet temperature (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_TIT_MIL_K: entry({
    id: 'BRAYTON_TIT_MIL_K',
    value: 1850,
    quantity: 'brayton.tit.mil',
    unit: 'K',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed mil/max combustor exit / turbine inlet temperature (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_AB_TEMP_MAX_K: entry({
    id: 'BRAYTON_AB_TEMP_MAX_K',
    value: 2150,
    quantity: 'brayton.ab.temp.max',
    unit: 'K',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed maximum afterburner exit total temperature (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_ETA_FAN: entry({
    id: 'BRAYTON_ETA_FAN',
    value: 0.89,
    quantity: 'brayton.eta.fan',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook axial fan isentropic efficiency for teaching Brayton cycle (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_ETA_HPC: entry({
    id: 'BRAYTON_ETA_HPC',
    value: 0.87,
    quantity: 'brayton.eta.hpc',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook high-pressure compressor isentropic efficiency (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_ETA_HPT: entry({
    id: 'BRAYTON_ETA_HPT',
    value: 0.9,
    quantity: 'brayton.eta.hpt',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook high-pressure turbine isentropic efficiency (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_ETA_LPT: entry({
    id: 'BRAYTON_ETA_LPT',
    value: 0.91,
    quantity: 'brayton.eta.lpt',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook low-pressure turbine isentropic efficiency (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_ETA_NOZZLE: entry({
    id: 'BRAYTON_ETA_NOZZLE',
    value: 0.97,
    quantity: 'brayton.eta.nozzle',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook convergent-divergent nozzle total pressure recovery (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_COMBUSTOR_DP_FRAC: entry({
    id: 'BRAYTON_COMBUSTOR_DP_FRAC',
    value: 0.04,
    quantity: 'brayton.combustor.dp.frac',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook annular combustor fractional total pressure drop (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_AB_DP_FRAC: entry({
    id: 'BRAYTON_AB_DP_FRAC',
    value: 0.05,
    quantity: 'brayton.ab.dp.frac',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Textbook afterburner fractional total pressure loss when lit (F119 cycle not publicly disclosed)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_UNLIT_PR_FRAC: entry({
    id: 'BRAYTON_UNLIT_PR_FRAC',
    value: 0.25,
    quantity: 'brayton.unlit.pr.frac',
    unit: '1',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Motoring compression fraction before light-off for smooth Brayton start transition',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  BRAYTON_MIN_TURBINE_TERM: entry({
    id: 'BRAYTON_MIN_TURBINE_TERM',
    value: 0.05,
    quantity: 'brayton.min.turbine.term',
    unit: '1',
    label: 'HEURISTIC',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Numerical guard keeping turbine pressure-ratio base strictly positive',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  ISA_STRATOSPHERE_CEILING_M: entry({
    id: 'ISA_STRATOSPHERE_CEILING_M',
    value: 20_000,
    quantity: 'isa.stratosphere.ceiling',
    unit: 'm',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ISO 2533 / ICAO ISA upper ceiling of isothermal lower stratosphere band (20 km)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
  JET_FUEL_LHV_J_KG: entry({
    id: 'JET_FUEL_LHV_J_KG',
    value: 43_200_000,
    unit: 'J/kg',
    quantity: 'fuel.lower_heating_value',
    label: 'ASSUMED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Assumed JP-8 / Jet A-1 lower heating value (~43.2 MJ/kg textbook teaching value for Brayton first-law check)',
    calibratedOn: [],
    commit: 'v1.2-thermal',
  }),
} as const satisfies Record<string, RegistryEntry>;

export type ConstantId = keyof typeof CONSTANTS_REGISTRY;

export const REGISTRY_CATEGORIES: readonly ConstantCategory[] = [
  'Physical & Atmosphere',
  'Airframe & Dimensions',
  'Propulsion & Engine Model',
  'Control Surfaces & Gear',
  'Weapons Bays & Cockpit',
  'Acoustics & Scene',
];

export const REGISTRY_ENTRIES: readonly RegistryEntry[] = Object.values(CONSTANTS_REGISTRY);

function formatConstantValue(val: ConstantValue, unit: string): string {
  if (typeof val === 'number') {
    const numStr =
      Math.abs(val) >= 1e6 || (val !== 0 && Math.abs(val) < 1e-3)
        ? val.toExponential(4)
        : Number.isInteger(val)
          ? val.toLocaleString('en-US')
          : String(val);
    return unit === '1' ? `\`${numStr}\`` : `\`${numStr} ${unit}\``;
  }
  if (val.length > 0 && typeof val[0] === 'number') {
    const nums = val as readonly number[];
    const list = nums.join(', ');
    return unit === '1' ? `\`[${list}]\`` : `\`[${list}] ${unit}\``;
  }
  if (val.length > 0 && Array.isArray(val[0]) && val[0].length === 3) {
    const rows = val as readonly (readonly [number, number, number])[];
    return `\`[${rows.length} layers]\` (${unit})`;
  }
  const pairs = val as readonly (readonly [number, number])[];
  const summary = pairs.map(([a, b]) => `${a}:${b}`).join(', ');
  return `\`[${pairs.length} pts]\` (${summary})`;
}

/**
 * Render the Markdown tables for docs/ASSUMPTIONS.md directly from CONSTANTS_REGISTRY.
 * Used both by scripts/generate-assumptions-tables.ts and tests/constants-registry.test.ts.
 */
export function renderConstantsRegistryMarkdown(): string {
  const lines: string[] = [
    '<!-- BEGIN GENERATED: CONSTANTS_REGISTRY -->',
    '<!-- Auto-generated from src/sim/config/registry.ts via `pnpm docs:assumptions`. Do not edit by hand. -->',
    '',
    '## Constants Registry (Single Source of Truth)',
    '',
    `Every \`SOURCED\`, \`APPROXIMATE\`, \`CALIBRATED\`, \`EMPIRICAL\`, \`ASSUMED\`, and \`HEURISTIC\` constant in \`src/sim/\` (${REGISTRY_ENTRIES.length} entries) is defined in \`src/sim/config/registry.ts\` and rendered here automatically.`,
    '',
  ];

  for (const category of REGISTRY_CATEGORIES) {
    const items = REGISTRY_ENTRIES.filter((e) => e.category === category);
    if (items.length === 0) continue;
    lines.push(`### ${category}`);
    lines.push('');
    lines.push('| Constant | Value | Label | Calibrated On | Commit | Source / Derivation |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const item of items) {
      const valStr = formatConstantValue(item.value, item.unit);
      const calStr =
        item.calibratedOn.length > 0 ? item.calibratedOn.join(', ') : '—';
      const srcStr = item.uncertainty
        ? `${item.sourceOrDerivation} *(uncertainty: ${item.uncertainty})*`
        : item.sourceOrDerivation;
      lines.push(
        `| \`${item.id}\` | ${valStr} | \`${item.label}\` | ${calStr} | \`${item.commit}\` | ${srcStr} |`
      );
    }
    lines.push('');
  }

  lines.push('<!-- END GENERATED: CONSTANTS_REGISTRY -->');
  return lines.join('\n');
}
