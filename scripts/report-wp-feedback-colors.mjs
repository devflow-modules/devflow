#!/usr/bin/env node
/**
 * Relatório de cores de feedback Tailwind cruas em apps/whatsapp-platform/src.
 * Modo aviso (exit 0). Para endurecer CI no futuro: comparar saída com baseline zero.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "apps", "whatsapp-platform", "src");

const TAGS = [
  "amber-",
  "yellow-",
  "red-",
  "rose-",
  "green-",
  "emerald-",
  "blue-",
  "sky-",
];

const SKIP_DIR = new Set(["node_modules", ".next", "generated"]);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIR.has(name)) continue;
      yield* walk(full);
    } else if (/\.(tsx|ts|css)$/.test(name)) {
      yield full;
    }
  }
}

function main() {
  const byFile = [];
  let total = 0;
  for (const file of walk(TARGET)) {
    const text = fs.readFileSync(file, "utf8");
    const hits = [];
    for (const t of TAGS) {
      let i = 0;
      while ((i = text.indexOf(t, i)) !== -1) {
        const line = text.slice(0, i).split("\n").length;
        hits.push({ tag: t, line });
        total++;
        i += t.length;
      }
    }
    if (hits.length) {
      byFile.push({ file: path.relative(ROOT, file), hits });
    }
  }

  console.log(`[feedback-colors:whatsapp] Ocorrências de prefixos crus (${TAGS.join(", ")}): ${total}\n`);
  if (total === 0) {
    console.log("Nenhuma ocorrência — migrar gradualmente ou mantidos só como rgb()/vars.");
    return;
  }
  for (const { file, hits } of byFile.sort((a, b) => b.hits.length - a.hits.length)) {
    console.log(`${file} (${hits.length})`);
    const sample = hits.slice(0, 6).map((h) => `${h.tag}@${h.line}`);
    console.log(`  … ${sample.join(", ")}${hits.length > 6 ? " …" : ""}`);
  }
  console.log("\nGráficos/branding/semáforos podem ficar com rgb() ou comentário local.");
}

main();
