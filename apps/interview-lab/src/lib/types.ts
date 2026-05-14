export type ProblemPattern =
  | "Frequency Map"
  | "Sorting + Tie-breaker"
  | "Two Pointers"
  | "Async JavaScript"
  | "Frontend Logic";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type ChecklistId =
  | "restated"
  | "ioConfirmed"
  | "explainedApproach"
  | "pseudocode"
  | "testedExamples"
  | "complexity"
  | "noLongSilence";

export const CHECKLIST_ITEMS: { id: ChecklistId; label: string }[] = [
  { id: "restated", label: "Restated the problem" },
  { id: "ioConfirmed", label: "Confirmed input/output" },
  { id: "explainedApproach", label: "Explained approach" },
  { id: "pseudocode", label: "Wrote pseudocode/comments" },
  { id: "testedExamples", label: "Tested examples" },
  { id: "complexity", label: "Explained complexity" },
  { id: "noLongSilence", label: "Avoided long silence" },
];

export type ChecklistState = Record<ChecklistId, boolean>;

export function emptyChecklist(): ChecklistState {
  return {
    restated: false,
    ioConfirmed: false,
    explainedApproach: false,
    pseudocode: false,
    testedExamples: false,
    complexity: false,
    noLongSilence: false,
  };
}

export type SyncTestCase = {
  id: string;
  input: unknown[];
  expected: unknown;
};

export type ProblemDefinition = {
  id: string;
  title: string;
  difficulty: Difficulty;
  pattern: ProblemPattern;
  prompt: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starterCode: string;
  testCases: SyncTestCase[];
  /** Quando presente, corre em vez de `testCases` (ex.: debounce com timers reais). */
  runCustomTests?: (solve: (...args: unknown[]) => unknown) => Promise<TestOutcome[]>;
  idealApproach: string;
  complexity: string;
};

export type TestOutcome = {
  id: string;
  pass: boolean;
  expected?: unknown;
  received?: unknown;
  detail?: string;
};

/** Labels estáveis gravados em `freezeReasons` (inglês, coerente com a UI). */
export const FREEZE_REASON_OPTIONS = [
  "Understanding the problem",
  "Choosing data structure",
  "Writing syntax",
  "Explaining in English",
  "Testing examples",
  "Time pressure",
  "Keyboard/symbols",
  "Other",
] as const;

export type FreezeReasonLabel = (typeof FREEZE_REASON_OPTIONS)[number];

export type SessionRecord = {
  id: string;
  problemId: string;
  code: string;
  elapsedTimeSec: number;
  checklist: ChecklistState;
  passedTests: number;
  totalTests: number;
  createdAt: string;
  /** Onde sentiste travar (preenchido na review). */
  freezeReasons?: string[];
  confidenceBefore?: number;
  confidenceAfter?: number;
  notes?: string;
  /** O que disseste em inglês durante a simulação (opcional). */
  spokenEnglishNotes?: string;
  /** Último resultado de testes ao finalizar (para export de falhas). */
  testOutcomes?: TestOutcome[];
  /** Modo No Silence ao finalizar (Sprint 0.5). */
  noSilenceMode?: "off" | "gentle" | "interview";
  /** Nudges automáticos disparados durante a sessão. */
  nudgeCount?: number;
  /** Cliques em "I said something". */
  manualSpeakResetCount?: number;
  /** Reflexão: uso do Keyboard Rescue Kit (`null` = explicitamente não registado). */
  keyboardRescueUsed?: boolean | null;
  /** Reflexão: notas sobre problemas de teclado. */
  keyboardIssueNotes?: string;
};

export const TIMER_TOTAL_SEC = 25 * 60;

/** Subconjunto legado dos símbolos (referência); o painel completo está em `keyboard-rescue.ts`. */
export const SYMBOL_PAD_ENTRIES: { label: string; value: string }[] = [
  { label: "|", value: "|" },
  { label: "||", value: "||" },
  { label: "&&", value: "&&" },
  { label: "\\", value: "\\" },
  { label: "/", value: "/" },
  { label: "{", value: "{" },
  { label: "}", value: "}" },
  { label: "[", value: "[" },
  { label: "]", value: "]" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
  { label: "=>", value: "=>" },
  { label: "!==", value: "!==" },
  { label: "===", value: "===" },
  { label: "<=", value: "<=" },
  { label: ">=", value: ">=" },
  { label: "`", value: "`" },
  { label: "'", value: "'" },
  { label: '"', value: '"' },
  { label: ";", value: ";" },
  { label: ":", value: ":" },
  { label: "?", value: "?" },
  { label: ".", value: "." },
];
