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
  // 1. Physical & Atmosphere (universal sea-level reference constants)
  // =========================================================================
  G0: entry({
    id: 'G0',
    value: 9.80665,
    unit: 'm/s^2',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'CGPM 1901 / ISO 80000-3 standard gravity',
    calibratedOn: [],
    commit: 'phase0',
  }),
  SEA_LEVEL_DENSITY_KG_M3: entry({
    id: 'SEA_LEVEL_DENSITY_KG_M3',
    value: 1.225,
    unit: 'kg/m^3',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ICAO / US Standard Atmosphere 1976 sea-level air density (15 °C, 101.325 kPa)',
    calibratedOn: [],
    commit: 'phase0',
  }),
  SEA_LEVEL_SPEED_OF_SOUND_MS: entry({
    id: 'SEA_LEVEL_SPEED_OF_SOUND_MS',
    value: 340.294,
    unit: 'm/s',
    label: 'SOURCED',
    category: 'Physical & Atmosphere',
    sourceOrDerivation: 'ICAO / US Standard Atmosphere 1976 sea-level speed of sound (15 °C)',
    calibratedOn: [],
    commit: 'phase0',
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
