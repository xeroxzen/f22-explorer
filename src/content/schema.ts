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

export interface ComponentSpec {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly status: SpecStatus;
  readonly source: string;
}

export interface ComponentContent {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly summary: string;
  readonly role: string;
  readonly materials?: string;
  readonly specs: readonly ComponentSpec[];
  readonly sources: readonly string[];
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

  if (obj['materials'] !== undefined) {
    if (typeof obj['materials'] !== 'string' || obj['materials'].trim().length === 0) {
      throw new Error(`${fileHint}: optional "materials" must be a non-empty string`);
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
