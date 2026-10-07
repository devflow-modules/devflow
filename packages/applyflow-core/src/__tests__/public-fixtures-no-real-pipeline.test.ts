import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const FORBIDDEN = [
  "Gal Gordon",
  "Luxury Presence",
  "Alicia Strait",
  "TRM Labs",
  "Juliana Piazentin",
  "Mateus Nunes",
  "Isabela Marcon",
  "Litza Lopes",
  "Manuela Rivera Posada",
  "Marie Christine Umali",
  "Nathália Sandi",
  "Rebecca Simões",
  "Ester Paganini",
];

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

function walkJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkJsonFiles(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

describe("public ApplyFlow fixtures", () => {
  it("nunca contêm o pipeline real de networking do usuário", () => {
    const roots = [
      join(repoRoot, "apps/applyflow/public/demo"),
      join(repoRoot, "docs/career-suite/demo/fixtures"),
    ];
    const files = roots.flatMap((root) => walkJsonFiles(root));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        expect(text.includes(token), `${file} contains ${token}`).toBe(false);
      }
    }
  });
});
