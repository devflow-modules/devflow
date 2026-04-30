#!/usr/bin/env node
/**
 * Substitui utilitários Tailwind legados por classes df-* / semânticas.
 * Idempotente para várias execuções (não duplica prefixos).
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

/** Ordem: tons mais escuros (950…) primeiro para não colidir com prefixos. */
const REPLACEMENTS = [
  // text-slate / gray / zinc / neutral (950→50)
  ...["slate", "gray", "zinc", "neutral"].flatMap((fam) => [
    [new RegExp(`\\btext-${fam}-950\\b`, "g"), "df-text-primary"],
    [new RegExp(`\\btext-${fam}-900\\b`, "g"), "df-text-primary"],
    [new RegExp(`\\btext-${fam}-800\\b`, "g"), "df-text-primary"],
    [new RegExp(`\\btext-${fam}-700\\b`, "g"), "df-text-secondary"],
    [new RegExp(`\\btext-${fam}-600\\b`, "g"), "df-text-secondary"],
    [new RegExp(`\\btext-${fam}-500\\b`, "g"), "df-text-muted"],
    [new RegExp(`\\btext-${fam}-400\\b`, "g"), "df-text-muted"],
    [new RegExp(`\\btext-${fam}-300\\b`, "g"), "df-text-muted"],
    [new RegExp(`\\btext-${fam}-200\\b`, "g"), "df-text-secondary"],
    [new RegExp(`\\btext-${fam}-100\\b`, "g"), "df-text-primary"],
    [new RegExp(`\\btext-${fam}-50\\b`, "g"), "df-text-primary"],
  ]),
  [/\btext-white\/40\b/g, "df-text-muted"],
  [/\btext-white\/50\b/g, "df-text-muted"],
  [/\btext-white\/60\b/g, "df-text-muted"],
  // borders (100–200 subtis → border-border; resto contorno token)
  ...["slate", "gray", "zinc"].flatMap((fam) =>
    [100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [
      new RegExp(`\\bborder-${fam}-${n}\\b`, "g"),
      n <= 200 ? "border-border" : "df-border-dark",
    ]),
  ),
  // backgrounds neutros → superfícies semânticas
  ...["slate", "gray", "zinc"].flatMap((fam) => [
    [new RegExp(`\\bbg-${fam}-950\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-900\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-800\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-700\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-600\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-500\\b`, "g"), "bg-muted-foreground/40"],
    [new RegExp(`\\bbg-${fam}-400\\b`, "g"), "bg-muted-foreground/35"],
    [new RegExp(`\\bbg-${fam}-300\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-200\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-100\\b`, "g"), "bg-muted"],
    [new RegExp(`\\bbg-${fam}-50\\b`, "g"), "bg-muted/60"],
  ]),
  [/\bbg-white\b/g, "bg-card"],
  // from/via/to em gradientes comuns
  [/\bfrom-white\b/g, "from-card"],
  [/\bvia-white\b/g, "via-card"],
  [/\bto-slate-50\b/g, "to-muted/40"],
  [/\bto-slate-50\/80\b/g, "to-muted/50"],
  [/\bto-slate-50\/90\b/g, "to-muted/55"],
  [/\bfrom-slate-50\b/g, "from-muted/40"],
  [/\bbg-slate-50\/90\b/g, "bg-muted/50"],
];

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
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

function transform(content) {
  let out = content;
  for (const [re, rep] of REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out;
}

function main() {
  let files = 0;
  for (const root of collectRoots()) {
    for (const file of walkFiles(root)) {
      const raw = fs.readFileSync(file, "utf8");
      const next = transform(raw);
      if (next !== raw) {
        fs.writeFileSync(file, next, "utf8");
        files++;
        console.log(path.relative(ROOT, file));
      }
    }
  }
  console.log(`\n[codemod-design-tokens] ${files} ficheiro(s) alterados.`);
}

main();
