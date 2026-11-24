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
  | 'HEURISTIC';

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
    unit: 'm^2',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Lockheed Martin / USAF public data (840 sq ft)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_LE_SWEEP_DEG: entry({
    id: 'F22_WING_LE_SWEEP_DEG',
    value: 42,
    unit: 'deg',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Lockheed Martin / NASA-AIAA public fighter planform literature',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_WING_TE_SWEEP_DEG: entry({
    id: 'F22_WING_TE_SWEEP_DEG',
    value: -17,
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
    unit: 'deg',
    label: 'SOURCED',
    category: 'Airframe & Dimensions',
    sourceOrDerivation: 'Outward vertical tail cant angle from public aerodynamic/stealth literature',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F22_EMPTY_WEIGHT_KG: entry({
    id: 'F22_EMPTY_WEIGHT_KG',
    value: 19_700,
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
    unit: '1',
    label: 'SOURCED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'USAF F-22 Fact Sheet & Pratt & Whitney (twin F119-PW-100)',
    calibratedOn: [],
    commit: 'phase1',
  }),
  F119_AB_THRUST_CLASS_KN: entry({
    id: 'F119_AB_THRUST_CLASS_KN',
    value: 156,
    unit: 'kN',
    label: 'APPROXIMATE',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'USAF Fact Sheet & Pratt & Whitney public 35,000+ lbf afterburning thrust class per engine',
    calibratedOn: [],
    commit: 'phase1',
    uncertainty: '35,000+ lbf class; exact static thrust not publicly disclosed',
  }),
  F119_DRY_THRUST_CLASS_KN: entry({
    id: 'F119_DRY_THRUST_CLASS_KN',
    value: 107,
    unit: 'kN',
    label: 'APPROXIMATE',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Public aerospace reference range (~22,000–26,000 lbf / 98–116 kN dry military thrust)',
    calibratedOn: [],
    commit: 'phase1',
    uncertainty: '±9 kN public estimate range',
  }),
  F119_BYPASS_RATIO_APPROX: entry({
    id: 'F119_BYPASS_RATIO_APPROX',
    value: 0.3,
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
    unit: 'deg',
    label: 'SOURCED',
    category: 'Propulsion & Engine Model',
    sourceOrDerivation: 'Pratt & Whitney F119 public specification (±20° 2D pitch thrust vectoring)',
    calibratedOn: [],
    commit: 'phase1',
  }),

  // =========================================================================
  // 4. Control Surfaces & Gear (Educational Ranges — DoD limits classified)
  // =========================================================================
  F22_GEAR_TRACK_M: entry({
    id: 'F22_GEAR_TRACK_M',
    value: 3.23,
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
    unit: 'rounds',
    label: 'SOURCED',
    category: 'Weapons Bays & Cockpit',
    sourceOrDerivation: 'USAF F-22 Fact Sheet & Air & Space Forces Magazine (20 mm M61A2 internal cannon)',
    calibratedOn: [],
    commit: 'phase1',
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
