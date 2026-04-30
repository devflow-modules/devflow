#!/usr/bin/env node
/**
 * Enforcement manual do design system DevFlow (Tailwind legado + estilos inline).
 * Executar: `node scripts/verify-design-system.mjs`
 * Integrar em CI quando o repositório estiver sem violações.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "dist",
  "out",
  "build",
  ".turbo",
  "coverage",
  "generated",
]);

const EXT_RE = /\.(tsx|ts|jsx|js)$/;

/** Padrões banidos em strings de className / JSX (não aplicar a ficheiros só de tokens CSS). */
const BAN_SUBSTRINGS = [
  "text-slate-",
  "text-gray-",
  "text-zinc-",
  "text-neutral-",
  "text-white/40",
  "text-white/50",
  "text-white/60",
  "border-slate-",
  "border-gray-",
  "border-zinc-",
  "bg-slate-",
  "bg-gray-",
  "bg-zinc-",
  "bg-white",
];

/**
 * `style={{ ... }}` com cor/fundo estático (hex, gradientes decorativos).
 * Permite: width/height %, animationDelay, display, margin, tipografia sem #.
 */
function hasForbiddenStyleObject(source) {
  const re = /style=\{\{([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const inner = m[1];
    if (/#([0-9a-fA-F]{3,8})\b/.test(inner)) return true;
    if (/\bradial-gradient|\blinear-gradient/i.test(inner)) return true;
    if (/rgba\(\s*15\s*,\s*23\s*,\s*42/i.test(inner)) return true;
    if (/rgba\(\s*34\s*,\s*197\s*,\s*94/i.test(inner)) return true;
    if (/rgba\(\s*56\s*,\s*189\s*,\s*248/i.test(inner)) return true;
  }
  return false;
}

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR_NAMES.has(e.name)) continue;
      yield* walkFiles(full);
    } else if (e.isFile() && EXT_RE.test(e.name)) {
      yield full;
    }
  }
}

function collectRoots() {
  const roots = [path.join(ROOT, "src")];
  const appsDir = path.join(ROOT, "apps");
  if (fs.existsSync(appsDir)) {
    for (const name of fs.readdirSync(appsDir)) {
      const src = path.join(appsDir, name, "src");
      if (fs.existsSync(src)) roots.push(src);
    }
  }
  const packagesDir = path.join(ROOT, "packages");
  if (fs.existsSync(packagesDir)) {
    for (const name of fs.readdirSync(packagesDir)) {
      const src = path.join(packagesDir, name, "src");
      if (fs.existsSync(src)) roots.push(src);
    }
  }
  const tpl = path.join(ROOT, "templates", "product-app", "src");
  if (fs.existsSync(tpl)) roots.push(tpl);
  return roots;
}

function relative(p) {
  return path.relative(ROOT, p);
}

function main() {
  const violations = [];
  const roots = collectRoots();

  for (const root of roots) {
    for (const file of walkFiles(root)) {
      const rel = relative(file);
      if (rel.startsWith(`scripts${path.sep}`)) continue;
      /** React Email: estilos inline são requisito dos clientes de correio, não UI da app. */
      if (rel.includes(`${path.sep}modules${path.sep}email${path.sep}templates${path.sep}`)) continue;

      const text = fs.readFileSync(file, "utf8");

      for (const sub of BAN_SUBSTRINGS) {
        let idx = 0;
        while ((idx = text.indexOf(sub, idx)) !== -1) {
          const line = text.slice(0, idx).split("\n").length;
          violations.push({ rel, line, rule: `substring: ${sub}` });
          idx += sub.length;
        }
      }

      if (hasForbiddenStyleObject(text)) {
        violations.push({ rel, line: null, rule: "style={{ ... color|background|gradient }}" });
      }
    }
  }

  if (violations.length) {
    console.error(`[design-system] ${violations.length} violação(ões):\n`);
    for (const v of violations.slice(0, 80)) {
      console.error(`  ${v.rel}${v.line != null ? `:${v.line}` : ""} — ${v.rule}`);
    }
    if (violations.length > 80) console.error(`  … e mais ${violations.length - 80}`);
    console.error("\nSubstituir por classes `df-*` / tokens em globals/tokens.");
    process.exit(1);
  }

  console.log("[design-system] OK — sem text-slate|gray|zinc, border-slate, text-white/40–60 nem style color/background.");
}

main();
