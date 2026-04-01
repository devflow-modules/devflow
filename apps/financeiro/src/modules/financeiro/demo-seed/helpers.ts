import {
  DEMO_ACCOUNT_NAMES,
  DEMO_CATEGORY_MARKER,
  DEMO_GOAL_OBSERVATIONS_TAG,
  DEMO_INCOME_NOTES_TAG,
  DEMO_RULE_NAME_PREFIX,
  DEMO_SOURCE_NAMES,
} from "./constants";

export function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function isDemoAccountName(name: string): boolean {
  return (DEMO_ACCOUNT_NAMES as readonly string[]).includes(name);
}

export function demoCategoryName(label: string): string {
  return `${label}${DEMO_CATEGORY_MARKER}`;
}

/** Log estruturado para operadores (sem PII além de ids já opacos) */
export function logFinanceiroDemo(event: string, meta: Record<string, unknown> = {}): void {
  console.info("[financeiro-demo]", JSON.stringify({ event, ...meta, ts: new Date().toISOString() }));
}

export function parseSeedCliArgs(argv: string[]): { email: string | null; resetDemo: boolean } {
  const emailIdx = argv.indexOf("--email");
  const email = emailIdx >= 0 ? argv[emailIdx + 1] ?? null : null;
  const resetDemo = argv.includes("--reset-demo");
  return { email, resetDemo };
}

export function demoSeedInvariantCheck(): {
  accountNames: readonly string[];
  sourceNames: readonly string[];
  marker: string;
  rulePrefix: string;
  incomeTag: string;
  goalTag: string;
} {
  return {
    accountNames: DEMO_ACCOUNT_NAMES,
    sourceNames: DEMO_SOURCE_NAMES,
    marker: DEMO_CATEGORY_MARKER,
    rulePrefix: DEMO_RULE_NAME_PREFIX,
    incomeTag: DEMO_INCOME_NOTES_TAG,
    goalTag: DEMO_GOAL_OBSERVATIONS_TAG,
  };
}

/** Soma planejada de despesas seed por categoria no mês corrente (alinhado ao script de seed) */
export function plannedDemoExpenseTotalsByCategory(): Record<string, number> {
  return {
    [demoCategoryName("Supermercado")]: 420 + 185.5,
    [demoCategoryName("Moradia")]: 210 + 120 + 680,
    [demoCategoryName("Lazer")]: 55 + 159,
    [demoCategoryName("Saúde")]: 89.9,
    [demoCategoryName("Software e nuvem")]: 180 + 45 + 32 + 90,
    [demoCategoryName("Infraestrutura criativa")]: 2400 + 890 + 199 + 450 + 200,
  };
}
