import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_COMPONENTS } from '../src/content/registry.js';
import {
  VALID_SPEC_STATUSES,
  validateComponentContent,
  validatePartsHierarchy,
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

describe('Component content JSON schema & hierarchy validation', () => {
  it('accepts valid SOURCED, APPROXIMATE, ASSUMED, and NOT_PUBLICLY_DISCLOSED specs', () => {
    const sample = {
      id: 'sample-part',
      title: 'Sample Part',
      parentId: null,
      category: 'Airframe',
      label: 'SOURCED',
      summary: 'Sample educational description.',
      role: 'Demonstrates schema validation.',
      materials: 'Titanium alloy and composite skins (public overview).',
      modelingNotes: {
        stationRangeM: [0, 18.92],
        approxSizeM: [13.56, 5.08, 18.92],
        proportionReference: 'USAF F-22 Fact Sheet',
        confidence: 'HIGH',
      },
      interaction: {
        explodes: false,
        explodeVectorM: [0, 0, 0],
        kind: 'static',
      },
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
          parentId: null,
          category: 'Test',
          label: 'SOURCED',
          summary: 'Summary',
          role: 'Role',
          modelingNotes: {
            stationRangeM: [0, 1],
            approxSizeM: [1, 1, 1],
            proportionReference: 'Test',
            confidence: 'LOW',
          },
          interaction: {
            explodes: false,
            explodeVectorM: [0, 0, 0],
            kind: 'static',
          },
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

  it('validates all 30–50 F-22 parts JSON files on disk and verifies tree integrity', () => {
    const dir = path.resolve(process.cwd(), 'src/content');
    const files = collectJsonFiles(dir);
    expect(files.length).toBeGreaterThanOrEqual(30);
    expect(files.length).toBeLessThanOrEqual(50);

    const validatedParts = files.map((file) => {
      const rel = path.relative(process.cwd(), file);
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const validated = validateComponentContent(raw, rel);
      expect(validated.sources.length).toBeGreaterThan(0);
      for (const spec of validated.specs) {
        expect(spec.source.trim().length).toBeGreaterThan(0);
        expect(VALID_SPEC_STATUSES).toContain(spec.status);
      }
      return validated;
    });

    validatePartsHierarchy(validatedParts);

    // Registry covers every JSON file on disk
    expect(ALL_COMPONENTS.length).toBe(files.length);

    // Classified areas must explicitly include NOT_PUBLICLY_DISCLOSED entries
    const allSpecs = ALL_COMPONENTS.flatMap((p) => p.specs);
    const classifiedSpecs = allSpecs.filter(
      (s) => s.status === 'NOT_PUBLICLY_DISCLOSED'
    );
    expect(classifiedSpecs.length).toBeGreaterThanOrEqual(4);
  });
});
