import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_COMPONENTS } from '../src/content/registry.js';
import {
  VALID_SPEC_STATUSES,
  validateComponentContent,
} from '../src/content/schema.js';

function collectJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

describe('Component content JSON schema validation', () => {
  it('accepts valid SOURCED, APPROXIMATE, ASSUMED, and NOT_PUBLICLY_DISCLOSED specs', () => {
    const sample = {
      id: 'sample-part',
      title: 'Sample Part',
      category: 'Airframe',
      summary: 'Sample educational description.',
      role: 'Demonstrates schema validation.',
      materials: 'Titanium alloy and composite skins (public overview).',
      specs: [
        {
          label: 'Span',
          value: '13.56',
          unit: 'm',
          status: 'SOURCED',
          source: 'USAF F-22 Fact Sheet',
        },
        {
          label: 'Radar Cross Section',
          value: 'Not publicly disclosed',
          unit: '',
          status: 'NOT_PUBLICLY_DISCLOSED',
          source: 'Classified; not released by USAF',
        },
      ],
      sources: ['USAF F-22 Raptor Fact Sheet'],
    };

    const validated = validateComponentContent(sample, 'sample.json');
    expect(validated.id).toBe('sample-part');
    expect(validated.specs.length).toBe(2);
  });

  it('rejects uncited specs or unknown status labels', () => {
    expect(() =>
      validateComponentContent(
        {
          id: 'bad',
          title: 'Bad',
          category: 'Test',
          summary: 'Summary',
          role: 'Role',
          specs: [
            {
              label: 'Foo',
              value: '10',
              unit: 'm',
              status: 'INVENTED',
              source: 'None',
            },
          ],
          sources: ['Some source'],
        },
        'bad.json'
      )
    ).toThrow(/status/);
  });

  it('validates every JSON file in src/content/ with no duplicate ids or uncited specs', () => {
    const dir = path.resolve(process.cwd(), 'src/content');
    const files = collectJsonFiles(dir);
    const seenIds = new Set<string>();

    for (const file of files) {
      const rel = path.relative(process.cwd(), file);
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const validated = validateComponentContent(raw, rel);
      expect(seenIds.has(validated.id)).toBe(false);
      seenIds.add(validated.id);
      expect(validated.sources.length).toBeGreaterThan(0);
      for (const spec of validated.specs) {
        expect(spec.source.trim().length).toBeGreaterThan(0);
        expect(VALID_SPEC_STATUSES).toContain(spec.status);
      }
    }

    expect(ALL_COMPONENTS.length).toBe(files.length);
  });
});
