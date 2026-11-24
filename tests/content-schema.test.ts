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
  it('accepts valid dual-labeled parts with traceable SOURCED citations', () => {
    const sample = {
      id: 'sample-part',
      title: 'Sample Part',
      parentId: null,
      category: 'Airframe',
      existenceLabel: 'SOURCED',
      geometryLabel: 'APPROXIMATE',
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
          urlOrLocator: 'https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104506/f-22-raptor/',
          accessed: '2026-11-24',
          snippet: 'Wingspan: 44 feet, 6 inches (13.6 meters)',
        },
        {
          label: 'Radar Cross Section',
          value: 'Not publicly disclosed',
          unit: '',
          status: 'NOT_PUBLICLY_DISCLOSED',
          source: 'Classified; not released by USAF',
        },
      ],
      sources: [
        {
          title: 'USAF F-22 Raptor Fact Sheet',
          urlOrLocator: 'https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104506/f-22-raptor/',
          accessed: '2026-11-24',
          snippet: 'General Characteristics: Length, Wingspan, Height',
        },
      ],
    };

    const validated = validateComponentContent(sample, 'sample.json');
    expect(validated.id).toBe('sample-part');
    expect(validated.existenceLabel).toBe('SOURCED');
    expect(validated.geometryLabel).toBe('APPROXIMATE');
  });

  it('rejects SOURCED specs missing traceable urlOrLocator, accessed date, or snippet', () => {
    expect(() =>
      validateComponentContent(
        {
          id: 'bad',
          title: 'Bad',
          parentId: null,
          category: 'Test',
          existenceLabel: 'SOURCED',
          geometryLabel: 'ASSUMED',
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
              status: 'SOURCED',
              source: 'Missing URL',
            },
          ],
          sources: [
            {
              title: 'Test',
              urlOrLocator: 'https://example.com',
              accessed: '2026-11-24',
              snippet: 'Short snippet',
            },
          ],
        },
        'bad.json'
      )
    ).toThrow(/urlOrLocator/);
  });

  it('validates all 30–50 F-22 parts JSON files on disk, dual labels, and tree integrity', () => {
    const dir = path.resolve(process.cwd(), 'src/content/parts');
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
    expect(ALL_COMPONENTS.length).toBe(files.length);

    // Geometry honesty check: inferred parts must NOT all be labeled SOURCED
    const approxOrAssumedGeom = ALL_COMPONENTS.filter(
      (p) => p.geometryLabel === 'APPROXIMATE' || p.geometryLabel === 'ASSUMED'
    );
    expect(approxOrAssumedGeom.length).toBeGreaterThanOrEqual(40);

    // Classified areas must explicitly include NOT_PUBLICLY_DISCLOSED entries
    const allSpecs = ALL_COMPONENTS.flatMap((p) => p.specs);
    const classifiedSpecs = allSpecs.filter(
      (s) => s.status === 'NOT_PUBLICLY_DISCLOSED'
    );
    expect(classifiedSpecs.length).toBeGreaterThanOrEqual(4);
  });
});
