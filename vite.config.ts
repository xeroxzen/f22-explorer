import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { validateComponentContent } from './src/content/schema.js';

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

function validateComponentsPlugin(): Plugin {
  return {
    name: 'validate-component-content',
    buildStart() {
      const dir = path.resolve(process.cwd(), 'src/content');
      const files = collectJsonFiles(dir);
      const seen = new Set<string>();
      for (const file of files) {
        const rel = path.relative(process.cwd(), file);
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        const valid = validateComponentContent(raw, rel);
        if (seen.has(valid.id)) {
          throw new Error(`Duplicate component id "${valid.id}" in ${rel}`);
        }
        seen.add(valid.id);
      }
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH || './',
  plugins: [react(), validateComponentsPlugin()],
  worker: {
    format: 'es',
  },
});
