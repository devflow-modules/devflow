import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { Result } from "axe-core";

function formatViolation(v: Result): string {
  const samples = v.nodes.slice(0, 6).map((n) => {
    const target = n.target.join(" > ");
    const html = n.html?.replace(/\s+/g, " ").trim().slice(0, 140);
    return `  • ${html ?? target}`;
  });
  return [`[${v.impact}] ${v.id}: ${v.help}`, `  Docs: ${v.helpUrl}`, ...samples].join("\n");
}

const SERIOUS_IMPACTS = new Set(["serious", "critical"]);

export type AxeScanOptions = {
  /** Limita a análise a regiões (seletores CSS aceites pelo axe `.include`). */
  include?: string[];
  /** Exclui regiões da análise (axe `.exclude`). */
  exclude?: string[];
  /** Desactiva regras específicas — usar só com comentário justificado no teste. */
  disableRules?: string[];
};

/**
 * Análise alinhada a WCAG 2.1 AA via tags do axe-core (regras etiquetadas wcag2a / wcag2aa / wcag21aa).
 * Inclui `color-contrast` e demais regras serious/critical associadas às tags WCAG.
 */
export async function scanWcag21AA(page: Page, options?: AxeScanOptions): Promise<{
  criticalSerious: Result[];
  moderate: Result[];
  rest: Result[];
}> {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  for (const selector of options?.include ?? []) {
    builder = builder.include(selector);
  }
  for (const selector of options?.exclude ?? []) {
    builder = builder.exclude(selector);
  }
  if (options?.disableRules?.length) {
    builder = builder.disableRules(options.disableRules);
  }
  const results = await builder.analyze();

  const criticalSerious = results.violations.filter((v) => v.impact && SERIOUS_IMPACTS.has(v.impact));
  const moderate = results.violations.filter((v) => v.impact === "moderate");
  const rest = results.violations.filter(
    (v) => !SERIOUS_IMPACTS.has((v.impact ?? "") as "serious" | "critical") && v.impact !== "moderate"
  );
  return { criticalSerious, moderate, rest };
}

export function assertNoCriticalOrSerious(context: string, criticalSerious: Result[]): void {
  if (criticalSerious.length === 0) return;
  const body = criticalSerious.map(formatViolation).join("\n\n---\n\n");
  expect(
    criticalSerious,
    `[a11y:${context}] violações axe serious/critical (tags WCAG 2.1 AA):\n${body}`
  ).toEqual([]);
}

export function logModerateWarnings(context: string, moderate: Result[]): void {
  for (const v of moderate) {
    console.warn(`[a11y:moderate][${context}] ${v.id} — ${v.help} (${v.nodes.length} nó(s))`);
  }
}

export function logRestWarnings(context: string, rest: Result[]): void {
  for (const v of rest) {
    console.warn(`[a11y:${v.impact ?? "n/a"}][${context}] ${v.id} — ${v.help}`);
  }
}

export async function expectNoSeriousViolationsForPage(
  page: Page,
  context: string,
  options?: AxeScanOptions
): Promise<void> {
  const { criticalSerious, moderate, rest } = await scanWcag21AA(page, options);
  logModerateWarnings(context, moderate);
  logRestWarnings(context, rest);
  assertNoCriticalOrSerious(context, criticalSerious);
}
