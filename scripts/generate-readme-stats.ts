import fs from 'node:fs';
import path from 'node:path';
import { ALL_COMPONENTS } from '../src/content/registry.js';
import { REGISTRY_ENTRIES } from '../src/sim/config/registry.js';

const START_MARKER = '<!-- BEGIN GENERATED: LABEL_COUNTS -->';
const END_MARKER = '<!-- END GENERATED: LABEL_COUNTS -->';

export function renderReadmeLabelCountsMarkdown(): string {
  const regCounts = { SOURCED: 0, APPROXIMATE: 0, ASSUMED: 0 };
  for (const e of REGISTRY_ENTRIES) {
    if (e.label === 'SOURCED') regCounts.SOURCED++;
    else if (e.label === 'APPROXIMATE') regCounts.APPROXIMATE++;
    else regCounts.ASSUMED++;
  }

  const partExistence = { SOURCED: 0, APPROXIMATE: 0, ASSUMED: 0, NOT_PUBLICLY_DISCLOSED: 0 };
  const partGeometry = { SOURCED: 0, APPROXIMATE: 0, ASSUMED: 0, NOT_PUBLICLY_DISCLOSED: 0 };
  const specCounts = { SOURCED: 0, APPROXIMATE: 0, ASSUMED: 0, NOT_PUBLICLY_DISCLOSED: 0 };

  for (const p of ALL_COMPONENTS) {
    partExistence[p.existenceLabel]++;
    partGeometry[p.geometryLabel]++;
    for (const s of p.specs) {
      specCounts[s.status]++;
    }
  }

  const totalSpecs =
    specCounts.SOURCED +
    specCounts.APPROXIMATE +
    specCounts.ASSUMED +
    specCounts.NOT_PUBLICLY_DISCLOSED;

  return [
    START_MARKER,
    '<!-- Auto-generated from src/sim/config/registry.ts and src/content/parts/*.json via `pnpm docs:readme`. Do not edit by hand. -->',
    '',
    '| Dataset | Total | `SOURCED` | `APPROXIMATE` | `ASSUMED` | `NOT_PUBLICLY_DISCLOSED` |',
    '| :--- | :---: | :---: | :---: | :---: | :---: |',
    `| Simulation & Model Registry (\`src/sim/config/registry.ts\`) | **${REGISTRY_ENTRIES.length}** | ${regCounts.SOURCED} | ${regCounts.APPROXIMATE} | ${regCounts.ASSUMED} | 0 |`,
    `| Parts — Existence Provenance (\`src/content/parts/*.json\`) | **${ALL_COMPONENTS.length}** | ${partExistence.SOURCED} | ${partExistence.APPROXIMATE} | ${partExistence.ASSUMED} | ${partExistence.NOT_PUBLICLY_DISCLOSED} |`,
    `| Parts — Geometry Provenance (\`src/content/parts/*.json\`) | **${ALL_COMPONENTS.length}** | ${partGeometry.SOURCED} | ${partGeometry.APPROXIMATE} | ${partGeometry.ASSUMED} | ${partGeometry.NOT_PUBLICLY_DISCLOSED} |`,
    `| Component Inspector Specs | **${totalSpecs}** | ${specCounts.SOURCED} | ${specCounts.APPROXIMATE} | ${specCounts.ASSUMED} | ${specCounts.NOT_PUBLICLY_DISCLOSED} |`,
    '',
    END_MARKER,
  ].join('\n');
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const readmePath = path.resolve(process.cwd(), 'README.md');
  const current = fs.readFileSync(readmePath, 'utf8');
  const startIdx = current.indexOf(START_MARKER);
  const endIdx = current.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('README.md is missing BEGIN/END GENERATED: LABEL_COUNTS markers');
  }
  const generated = renderReadmeLabelCountsMarkdown();
  const next =
    current.slice(0, startIdx) + generated + current.slice(endIdx + END_MARKER.length);

  if (checkOnly) {
    if (next !== current) {
      console.error('README.md label counts are out of sync! Run `pnpm docs:readme`.');
      process.exit(1);
    }
    console.log('README.md label counts are in sync with registry and content JSONs.');
    return;
  }

  fs.writeFileSync(readmePath, next, 'utf8');
  console.log('Updated README.md label counts from registry and content JSONs.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
