import { validateComponentContent, type ComponentContent } from './schema.js';

/**
 * Component/area content JSON entries.
 * Populated in Phase 1 (Research & Data) under src/content/**\/*.json.
 */
const RAW_COMPONENTS: readonly [string, unknown][] = [];

export const ALL_COMPONENTS: readonly ComponentContent[] = RAW_COMPONENTS.map(
  ([file, raw]) => validateComponentContent(raw, file)
);

export const COMPONENT_BY_ID: Readonly<Record<string, ComponentContent>> =
  Object.fromEntries(ALL_COMPONENTS.map((c) => [c.id, c]));

export function getComponentContent(id: string): ComponentContent | null {
  return COMPONENT_BY_ID[id] ?? null;
}
