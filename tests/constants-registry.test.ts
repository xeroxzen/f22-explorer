import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  CONSTANTS_REGISTRY,
  REGISTRY_ENTRIES,
  renderConstantsRegistryMarkdown,
  type ConstantLabel,
  type ConstantValue,
} from '../src/sim/config/registry.js';

const VALID_LABELS = new Set<ConstantLabel>([
  'SOURCED',
  'APPROXIMATE',
  'CALIBRATED',
  'EMPIRICAL',
  'ASSUMED',
  'HEURISTIC',
]);

const LABEL_REGEX =
  /\b(SOURCED|APPROXIMATE|CALIBRATED|EMPIRICAL|ASSUMED|HEURISTIC|DERIVED)\b/;

function collectTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('Constants Registry & Label Audit', () => {
  it('validates every registry entry has required provenance metadata', () => {
    expect(REGISTRY_ENTRIES.length).toBeGreaterThanOrEqual(3);

    for (const [key, item] of Object.entries(CONSTANTS_REGISTRY)) {
      expect(item.id).toBe(key);
      expect(VALID_LABELS.has(item.label)).toBe(true);
      expect(item.unit.trim().length).toBeGreaterThan(0);
      expect(item.sourceOrDerivation.trim().length).toBeGreaterThan(5);
      expect(item.commit.trim().length).toBeGreaterThanOrEqual(5);

      const val = item.value as ConstantValue;
      if (typeof val === 'number') {
        expect(Number.isFinite(val)).toBe(true);
      } else {
        expect(val.length).toBeGreaterThan(1);
      }

      if (item.label === 'CALIBRATED' || item.label === 'EMPIRICAL') {
        expect(
          item.calibratedOn.length,
          `${key} (${item.label}) must list calibratedOn sources`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('keeps docs/ASSUMPTIONS.md generated registry tables strictly in sync with code', () => {
    const assumptionsPath = path.resolve(process.cwd(), 'docs/ASSUMPTIONS.md');
    const content = fs.readFileSync(assumptionsPath, 'utf8');
    const beginMarker = '<!-- BEGIN GENERATED: CONSTANTS_REGISTRY -->';
    const endMarker = '<!-- END GENERATED: CONSTANTS_REGISTRY -->';
    const beginIdx = content.indexOf(beginMarker);
    const endIdx = content.indexOf(endMarker);

    expect(beginIdx).toBeGreaterThanOrEqual(0);
    expect(endIdx).toBeGreaterThan(beginIdx);

    const actualBlock = content.slice(beginIdx, endIdx + endMarker.length);
    const expectedBlock = renderConstantsRegistryMarkdown();
    expect(actualBlock).toBe(expectedBlock);
  });

  it('fails if any numeric constant in src/sim/** outside registry.ts lacks a provenance label', () => {
    const simDir = path.resolve(process.cwd(), 'src/sim');
    const files = collectTsFiles(simDir);
    const exemptBasenames = new Set(['registry.ts', 'math.ts', 'types.ts']);
    const violations: string[] = [];

    const constDeclRe = /^\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]+)\s*(?::[^=]+)?=\s*(.*)$/;
    const registryRefRe = /\b(?:CONSTANTS_REGISTRY|R)\.[A-Z0-9_]+\.value\b/;
    const numericExprRe = /^[-+]?(?:\d|\.\d|Math\.)/;

    for (const file of files) {
      if (exemptBasenames.has(path.basename(file))) continue;
      const rel = path.relative(process.cwd(), file);
      const lines = fs.readFileSync(file, 'utf8').split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const match = constDeclRe.exec(line);
        if (!match) continue;

        const constName = match[1]!;
        let rhs = match[2]!.trim();
        if (rhs === '' && i + 1 < lines.length) {
          rhs = lines[i + 1]!.trim();
        }

        if (registryRefRe.test(rhs)) continue;
        if (!numericExprRe.test(rhs)) continue;

        const contextLines = [line];
        for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
          const prev = lines[j]!.trim();
          if (
            prev.startsWith('//') ||
            prev.startsWith('/*') ||
            prev.startsWith('*') ||
            prev.endsWith('*/')
          ) {
            contextLines.push(prev);
          } else if (prev === '') {
            continue;
          } else {
            break;
          }
        }
        if (!LABEL_REGEX.test(contextLines.join('\n'))) {
          violations.push(`${rel}:${i + 1} (${constName} = ${rhs})`);
        }
      }
    }

    expect(
      violations,
      `Unlabeled numeric constants found outside src/sim/config/registry.ts:\n${violations.join('\n')}`
    ).toEqual([]);
  });

  it('flags any magic numeric literal in src/sim/** (excluding registry.ts) outside the allowlist', () => {
    const ALLOWED_LITERALS = new Set<number>([0, 1, 2, 0.5, -1, 1000, 3600, 1e6]);
    const MATH_ANNOTATION_RE = /\/\*\s*math:\s*[^*]+\*\//;
    const simDir = path.resolve(process.cwd(), 'src/sim');
    const exemptBasenames = new Set(['registry.ts', 'math.ts', 'types.ts']);
    const violations: string[] = [];

    for (const file of collectTsFiles(simDir)) {
      if (exemptBasenames.has(path.basename(file))) continue;
      const rel = path.relative(process.cwd(), file);
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split('\n');
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

      const visit = (node: ts.Node): void => {
        if (ts.isNumericLiteral(node)) {
          const parent = node.parent;
          if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) {
            return;
          }
          if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression)) {
            const method = parent.expression.name.text;
            if (method === 'toFixed' || method === 'slice') {
              return;
            }
          }

          const rawVal = Number(node.text);
          const isNeg =
            ts.isPrefixUnaryExpression(parent) &&
            parent.operator === ts.SyntaxKind.MinusToken;
          const signedVal = isNeg ? -rawVal : rawVal;

          const isTinyEpsilon = rawVal > 0 && rawVal <= 1e-3;
          if (ALLOWED_LITERALS.has(signedVal) || isTinyEpsilon) {
            return;
          }

          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          if (MATH_ANNOTATION_RE.test(lines[line]!)) {
            return;
          }

          violations.push(`${rel}:${line + 1} [${signedVal}]  ${lines[line]!.trim()}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }

    expect(
      violations,
      `Unregistered numeric literals found in src/sim/** — move to src/sim/config/registry.ts:\n${violations.join('\n')}`
    ).toEqual([]);
  });
});
