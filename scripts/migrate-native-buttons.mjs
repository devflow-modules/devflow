#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCOPES = [
  'src',
  'apps/site/src',
  'apps/whatsapp-platform/src',
  'apps/financeiro/src',
  'apps/investigamais/src',
];

const SKIP_FILES = new Set([
  'src/components/ui/button.tsx',
  'apps/site/src/components/ui/button.tsx',
  'apps/whatsapp-platform/src/components/ui/button.tsx',
  'apps/financeiro/src/components/ui/button.tsx',
  'apps/investigamais/src/components/ui/button.tsx',
]);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'generated'].includes(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile() && full.endsWith('.tsx')) {
      yield full;
    }
  }
}

function importPathFor(rel) {
  if (rel.startsWith('apps/whatsapp-platform/')) return '@/components/ui/button';
  if (rel.startsWith('apps/financeiro/')) return '@/components/ui/button';
  if (rel.startsWith('apps/investigamais/')) return '@/components/ui/button';
  return '@/components/ui';
}

function addButtonImport(src, rel) {
  if (/import\s+\{[^}]*\bButton\b[^}]*\}\s+from\s+["'][^"']+["']/.test(src)) return src;
  if (/import\s+Button\s+from\s+["'][^"']+["']/.test(src)) return src;

  const from = importPathFor(rel);
  const importLine = `import { Button } from "${from}";\n`;

  const importMatches = [...src.matchAll(/^import .*;\n/gm)];
  if (importMatches.length === 0) return importLine + src;
  const last = importMatches[importMatches.length - 1];
  const idx = last.index + last[0].length;
  return src.slice(0, idx) + importLine + src.slice(idx);
}

let filesChanged = 0;
let buttonsMigrated = 0;

for (const scope of SCOPES) {
  for (const abs of walk(path.join(ROOT, scope))) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (SKIP_FILES.has(rel)) continue;

    let src = fs.readFileSync(abs, 'utf8');
    const before = (src.match(/<button\b/g) || []).length;
    if (!before) continue;

    src = src.replace(/<button\b/g, '<Button');
    src = src.replace(/<\/button>/g, '</Button>');
    src = addButtonImport(src, rel);

    fs.writeFileSync(abs, src, 'utf8');
    filesChanged += 1;
    buttonsMigrated += before;
    console.log(`${rel} :: ${before}`);
  }
}

console.log(`\n[migrate-native-buttons] files=${filesChanged} buttons=${buttonsMigrated}`);
