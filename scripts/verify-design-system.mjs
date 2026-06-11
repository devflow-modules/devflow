#!/usr/bin/env node
/**
 * Enforcement DevFlow DS (Tailwind legado em TS/JS + CSS scoped).
 *
 * Modos:
 * - default: compara com `scripts/design-system-baseline.json` (bloqueia só violações novas)
 * - `--strict`: zero tolerância (dívida legada deve estar resolvida)
 * - `--write-baseline`: regen baseline a partir do working tree (após auditar main)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASELINE_PATH = path.join(__dirname, "design-system-baseline.json");

const ARGS = new Set(process.argv.slice(2));
const STRICT = ARGS.has("--strict");
const WRITE_BASELINE = ARGS.has("--write-baseline");

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

const EXT_TS = /\.(tsx|ts|jsx|js)$/;
const EXT_CSS = /\.(css|scss)$/;

/** CSS de outras apps ainda com paleta Tailwind clássica (migração incremental). */
const CSS_ALLOWLIST = new Set([
  "apps/site/src/app/globals.css",
  "apps/funklab/src/app/globals.css",
  "apps/ops/src/app/globals.css",
  "apps/investigamais/src/app/globals.css",
  "apps/financeiro/src/app/globals.css",
  "src/app/globals.css",
  "templates/product-app/src/app/globals.css",
]);

/** Padrões banidos em className / CSS (exceto CSS allowlisted). */
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
  "ring-slate-",
  "divide-slate-",
  "focus:ring-slate-",
];

/**
 * `style={{ ... }}` cor/fundo — só JSX/TSX.
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

function stripLineCommentsCss(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ");
}

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR_NAMES.has(e.name)) continue;
      yield* walkFiles(full);
    } else if (e.isFile() && (EXT_TS.test(e.name) || EXT_CSS.test(e.name))) {
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

function relPosix(rel) {
  return rel.split(path.sep).join("/");
}

function violationKey(v) {
  return `${relPosix(v.rel)}\t${v.rule}`;
}

function countViolations(violations) {
  const counts = {};
  for (const v of violations) {
    const k = violationKey(v);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
}

function writeBaseline(violations) {
  const counts = countViolations(violations);
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    note:
      "Dívida técnica pré-existente. CI bloqueia apenas ocorrências acima destes totais por ficheiro+regra. Regenerar com: node scripts/verify-design-system.mjs --write-baseline",
    totalOccurrences: violations.length,
    gitRef: (() => {
      try {
        return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
      } catch {
        return null;
      }
    })(),
    counts,
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    `[design-system] baseline escrita em ${path.relative(ROOT, BASELINE_PATH)} (${violations.length} ocorrência(s), ${Object.keys(counts).length} chave(s)).`,
  );
}

/** Violações acima da baseline (contagem por ficheiro+regra). */
function excessViolations(violations, baseline) {
  const current = countViolations(violations);
  const allowed = baseline.counts ?? {};
  const excess = [];

  for (const [key, count] of Object.entries(current)) {
    const cap = allowed[key] ?? 0;
    if (count > cap) {
      const [rel, rule] = key.split("\t");
      excess.push({ rel, rule, count, allowed: cap, delta: count - cap });
    }
  }

  return excess.sort((a, b) => b.delta - a.delta);
}

function collectViolations() {
  const violations = [];
  const roots = collectRoots();

  for (const root of roots) {
    for (const file of walkFiles(root)) {
      const rel = relative(file);
      if (rel.startsWith(`scripts${path.sep}`)) continue;
      if (rel.includes(`${path.sep}modules${path.sep}email${path.sep}templates${path.sep}`)) continue;

      const raw = fs.readFileSync(file, "utf8");
      const isCss = EXT_CSS.test(file);
      if (isCss) {
        const key = relPosix(rel);
        if (CSS_ALLOWLIST.has(key)) continue;
        const scanText = stripLineCommentsCss(raw);
        for (const sub of BAN_SUBSTRINGS) {
          let idx = 0;
          while ((idx = scanText.indexOf(sub, idx)) !== -1) {
            const line = scanText.slice(0, idx).split("\n").length;
            violations.push({ rel, line, rule: `substring: ${sub}`, kind: "css" });
            idx += sub.length;
          }
        }
        continue;
      }

      const text = raw;
      for (const sub of BAN_SUBSTRINGS) {
        let idx = 0;
        while ((idx = text.indexOf(sub, idx)) !== -1) {
          const line = text.slice(0, idx).split("\n").length;
          violations.push({ rel, line, rule: `substring: ${sub}`, kind: "ts" });
          idx += sub.length;
        }
      }

      if (hasForbiddenStyleObject(text)) {
        violations.push({ rel, line: null, rule: "style={{ ... color|background|gradient }}", kind: "ts" });
      }
    }
  }

  return violations;
}

function reportViolations(violations, heading) {
  console.error(`${heading}\n`);
  for (const v of violations.slice(0, 120)) {
    if (v.line != null) {
      console.error(`  ${relPosix(v.rel)}:${v.line} — ${v.rule}`);
    } else if (v.delta != null) {
      console.error(
        `  ${relPosix(v.rel)} — ${v.rule} (${v.count} atual, baseline ${v.allowed}, +${v.delta})`,
      );
    } else {
      console.error(`  ${relPosix(v.rel)} — ${v.rule}`);
    }
  }
  if (violations.length > 120) console.error(`  … e mais ${violations.length - 120}`);
  console.error("\nSubstituir por classes `df-*` / tokens em globals/tokens.");
}

/** Relatório apenas (não falha o script): cores Tailwind cruas típicas de feedback na WhatsApp Platform. */
function reportWhatsappPlatformFeedbackColors() {
  const target = path.join(ROOT, "apps", "whatsapp-platform", "src");
  if (!fs.existsSync(target)) {
    console.log("[design-system:whatsapp-feedback] pasta ausente — ignorado.");
    return;
  }
  const patterns = ["amber-", "red-", "green-", "blue-"];
  const byFile = new Map();
  for (const file of walkFiles(target)) {
    const rel = relative(file);
    const raw = fs.readFileSync(file, "utf8");
    let n = 0;
    for (const p of patterns) {
      let idx = 0;
      while ((idx = raw.indexOf(p, idx)) !== -1) {
        n += 1;
        idx += p.length;
      }
    }
    if (n > 0) byFile.set(rel, n);
  }
  const total = [...byFile.values()].reduce((a, b) => a + b, 0);
  const fileCount = byFile.size;
  console.log(
    `[design-system:whatsapp-feedback] (report-only, não bloqueia) ${total} ocorrência(s) de ${patterns.join(",")} em ${fileCount} ficheiro(s).`,
  );
  if (fileCount === 0) return;
  const sorted = [...byFile.entries()].sort((a, b) => b[1] - a[1]);
  for (const [rel, c] of sorted.slice(0, 20)) {
    console.log(`  ${c}× ${rel}`);
  }
  if (sorted.length > 20) {
    console.log(`  … e mais ${sorted.length - 20} ficheiro(s) com ocorrências.`);
  }
}

function main() {
  reportWhatsappPlatformFeedbackColors();
  const violations = collectViolations();

  if (WRITE_BASELINE) {
    writeBaseline(violations);
    return;
  }

  if (STRICT || !loadBaseline()) {
    if (violations.length) {
      reportViolations(violations, `[design-system] ${violations.length} violação(ões):`);
      process.exit(1);
    }
    console.log(
      "[design-system] OK — TS/JS + CSS (exceto allowlist): sem paleta Tailwind crua banida nem style JSX com cor.",
    );
    return;
  }

  const baseline = loadBaseline();
  const excess = excessViolations(violations, baseline);
  const newExcess = excess.filter((e) => e.delta > 0);

  if (newExcess.length) {
    reportViolations(
      newExcess,
      `[design-system] ${newExcess.reduce((n, e) => n + e.delta, 0)} nova(s) violação(ões) acima da baseline (${baseline.totalOccurrences ?? "?"} legado):`,
    );
    process.exit(1);
  }

  const legacy = violations.length;
  console.log(
    `[design-system] OK — ${legacy} ocorrência(s) dentro da baseline (${baseline.totalOccurrences ?? legacy} legado); nenhuma violação nova.`,
  );
}

main();
