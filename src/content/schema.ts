export type SpecStatus =
  | 'SOURCED'
  | 'APPROXIMATE'
  | 'ASSUMED'
  | 'NOT_PUBLICLY_DISCLOSED';

export const VALID_SPEC_STATUSES: readonly SpecStatus[] = [
  'SOURCED',
  'APPROXIMATE',
  'ASSUMED',
  'NOT_PUBLICLY_DISCLOSED',
];

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export const VALID_CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = [
  'HIGH',
  'MEDIUM',
  'LOW',
];

export type InteractionKind = 'static' | 'open' | 'retract' | 'articulate';

export const VALID_INTERACTION_KINDS: readonly InteractionKind[] = [
  'static',
  'open',
  'retract',
  'articulate',
];

export interface ComponentSpec {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly status: SpecStatus;
  readonly source: string;
}

export interface ModelingNotes {
  /** Fuselage station range [startM, endM] from nose tip (0..18.92 m). */
  readonly stationRangeM: readonly [number, number];
  /** Approximate bounding size [widthX, heightY, lengthZ] in meters. */
  readonly approxSizeM: readonly [number, number, number];
  /** Public reference used to establish proportions (never redistributed). */
  readonly proportionReference: string;
  readonly confidence: ConfidenceLevel;
}

export interface PartInteraction {
  readonly explodes: boolean;
  /** Approximate explode offset [dx, dy, dz] in meters at explode = 1. */
  readonly explodeVectorM: readonly [number, number, number];
  readonly kind: InteractionKind;
  readonly motionRange?: string;
  readonly motionLabel?: SpecStatus;
}

export interface ComponentContent {
  readonly id: string;
  readonly title: string;
  readonly parentId: string | null;
  readonly category: string;
  readonly label: SpecStatus;
  readonly summary: string;
  readonly role: string;
  readonly materials?: string;
  readonly modelingNotes: ModelingNotes;
  readonly interaction: PartInteraction;
  readonly specs: readonly ComponentSpec[];
  readonly sources: readonly string[];
}

function isTupleOfNumbers(val: unknown, len: number): boolean {
  return (
    Array.isArray(val) &&
    val.length === len &&
    val.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export function validateComponentContent(
  raw: unknown,
  fileHint: string
): ComponentContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${fileHint}: content must be a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  const reqStrings = ['id', 'title', 'category', 'summary', 'role'] as const;
  for (const key of reqStrings) {
    if (typeof obj[key] !== 'string' || obj[key].trim().length === 0) {
      throw new Error(`${fileHint}: missing or empty required string "${key}"`);
    }
  }

  if (obj['parentId'] !== null && (typeof obj['parentId'] !== 'string' || obj['parentId'].trim().length === 0)) {
    throw new Error(`${fileHint}: "parentId" must be a non-empty string or null`);
  }

  if (!VALID_SPEC_STATUSES.includes(obj['label'] as SpecStatus)) {
    throw new Error(
      `${fileHint}: "label" must be one of ${VALID_SPEC_STATUSES.join(', ')}`
    );
  }

  if (obj['materials'] !== undefined) {
    if (typeof obj['materials'] !== 'string' || obj['materials'].trim().length === 0) {
      throw new Error(`${fileHint}: optional "materials" must be a non-empty string`);
    }
  }

  const mn = obj['modelingNotes'] as Record<string, unknown> | undefined;
  if (!mn || typeof mn !== 'object') {
    throw new Error(`${fileHint}: missing "modelingNotes" object`);
  }
  if (!isTupleOfNumbers(mn['stationRangeM'], 2)) {
    throw new Error(`${fileHint}: modelingNotes.stationRangeM must be [startM, endM]`);
  }
  const [s0, s1] = mn['stationRangeM'] as [number, number];
  if (s0 < 0 || s1 < s0 || s1 > 20) {
    throw new Error(`${fileHint}: modelingNotes.stationRangeM out of bounds [${s0}, ${s1}]`);
  }
  if (!isTupleOfNumbers(mn['approxSizeM'], 3)) {
    throw new Error(`${fileHint}: modelingNotes.approxSizeM must be [w, h, l]`);
  }
  if (
    typeof mn['proportionReference'] !== 'string' ||
    mn['proportionReference'].trim().length === 0
  ) {
    throw new Error(`${fileHint}: modelingNotes.proportionReference must be non-empty`);
  }
  if (!VALID_CONFIDENCE_LEVELS.includes(mn['confidence'] as ConfidenceLevel)) {
    throw new Error(`${fileHint}: modelingNotes.confidence must be HIGH, MEDIUM, or LOW`);
  }

  const inter = obj['interaction'] as Record<string, unknown> | undefined;
  if (!inter || typeof inter !== 'object') {
    throw new Error(`${fileHint}: missing "interaction" object`);
  }
  if (typeof inter['explodes'] !== 'boolean') {
    throw new Error(`${fileHint}: interaction.explodes must be boolean`);
  }
  if (!isTupleOfNumbers(inter['explodeVectorM'], 3)) {
    throw new Error(`${fileHint}: interaction.explodeVectorM must be [dx, dy, dz]`);
  }
  if (!VALID_INTERACTION_KINDS.includes(inter['kind'] as InteractionKind)) {
    throw new Error(
      `${fileHint}: interaction.kind must be one of ${VALID_INTERACTION_KINDS.join(', ')}`
    );
  }
  if (inter['kind'] !== 'static') {
    if (typeof inter['motionRange'] !== 'string' || inter['motionRange'].trim().length === 0) {
      throw new Error(`${fileHint}: non-static interaction requires motionRange`);
    }
    if (!VALID_SPEC_STATUSES.includes(inter['motionLabel'] as SpecStatus)) {
      throw new Error(`${fileHint}: non-static interaction requires valid motionLabel`);
    }
  }

  if (!Array.isArray(obj['sources']) || obj['sources'].length === 0) {
    throw new Error(`${fileHint}: "sources" must be a non-empty array`);
  }
  for (const [i, src] of (obj['sources'] as unknown[]).entries()) {
    if (typeof src !== 'string' || src.trim().length === 0) {
      throw new Error(`${fileHint}: sources[${i}] must be a non-empty string`);
    }
  }

  if (!Array.isArray(obj['specs']) || obj['specs'].length === 0) {
    throw new Error(`${fileHint}: "specs" must be a non-empty array`);
  }
  for (const [i, item] of (obj['specs'] as unknown[]).entries()) {
    if (!item || typeof item !== 'object') {
      throw new Error(`${fileHint}: specs[${i}] must be an object`);
    }
    const s = item as Record<string, unknown>;
    for (const k of ['label', 'value', 'source'] as const) {
      if (typeof s[k] !== 'string' || s[k].trim().length === 0) {
        throw new Error(`${fileHint}: specs[${i}].${k} must be a non-empty string`);
      }
    }
    if (typeof s['unit'] !== 'string') {
      throw new Error(`${fileHint}: specs[${i}].unit must be a string`);
    }
    if (!VALID_SPEC_STATUSES.includes(s['status'] as SpecStatus)) {
      throw new Error(
        `${fileHint}: specs[${i}].status must be one of ${VALID_SPEC_STATUSES.join(', ')}`
      );
    }
  }

  return raw as ComponentContent;
}

export function validatePartsHierarchy(parts: readonly ComponentContent[]): void {
  const byId = new Map<string, ComponentContent>();
  for (const part of parts) {
    if (byId.has(part.id)) {
      throw new Error(`Duplicate part id "${part.id}"`);
    }
    byId.set(part.id, part);
  }

  const roots = parts.filter((p) => p.parentId === null);
  if (roots.length !== 1) {
    throw new Error(`Expected exactly 1 root part (parentId: null), found ${roots.length}`);
  }

  for (const part of parts) {
    if (part.parentId !== null && !byId.has(part.parentId)) {
      throw new Error(`Part "${part.id}" references missing parentId "${part.parentId}"`);
    }
    // Cycle check
    const visited = new Set<string>([part.id]);
    let cur = part.parentId;
    while (cur !== null) {
      if (visited.has(cur)) {
        throw new Error(`Cycle detected in part hierarchy involving "${part.id}"`);
      }
      visited.add(cur);
      cur = byId.get(cur)?.parentId ?? null;
    }
  }
}
