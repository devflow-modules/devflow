import type { JobContext } from "./types.js";

/**
 * Extrai contexto superficial de blocos de texto da vaga (ex.: sidebar / descrição).
 * Sprint 1 — heurísticas simples, sem DOM.
 */
export function extractJobContextFromText(text: string): JobContext {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rawSnippet = lines.slice(0, 8).join("\n");

  let title: string | undefined;
  let company: string | undefined;

  const atLine = lines.find((l) => /\sat\s+.+/i.test(l) && l.length < 120);
  if (atLine) {
    const m = atLine.match(/^(.+?)\s+at\s+(.+)$/i);
    if (m) {
      title = m[1].trim();
      company = m[2].replace(/\s*\(.*\)$/, "").trim();
    }
  }

  let location: string | undefined;
  const locLine = lines.find((l) => /^(remote|onsite|hybrid)\b/i.test(l) || /,?\s*[A-Z][a-z]+,\s*Brazil\b/.test(l));
  if (locLine) location = locLine;

  return {
    title,
    company,
    location,
    rawSnippet,
  };
}
