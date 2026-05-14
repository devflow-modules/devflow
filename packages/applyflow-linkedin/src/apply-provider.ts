export type ApplyProvider = "linkedin" | "workable" | "lever" | "unknown";

export type ApplyProviderDetection = {
  provider: ApplyProvider;
  /** Identificador curto para debug (sem texto do modal). */
  reason: string;
};

const SAMPLE_LEN = 20_000;

function modalPlainText(modalRoot: HTMLElement): string {
  const raw =
    typeof modalRoot.innerText === "string" && modalRoot.innerText.length > 0
      ? modalRoot.innerText
      : (modalRoot.textContent ?? "");
  return raw.slice(0, SAMPLE_LEN);
}

/** Minúsculas, sem acentos, espaços colapsados — alinhado à deteção de frases PT/EN no modal. */
export function normalizeApplyProviderSourceText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

type ProviderRule = {
  provider: Exclude<ApplyProvider, "unknown">;
  /** Primeira correspondência vence dentro da regra. */
  patterns: RegExp[];
  reasonPrefix: string;
};

/**
 * Ordem: Workable e Lever antes de LinkedIn, para não confundir textos que mencionem várias ATS.
 * LinkedIn: frases explícitas de fluxo "via / with" (PT/EN).
 */
const PROVIDER_RULES: ProviderRule[] = [
  {
    provider: "workable",
    patterns: [
      /\bcandidatura\s+via\s+workable\b/,
      /\bapplication\s+via\s+workable\b/,
      /\bpowered\s+by\s+workable\b/,
    ],
    reasonPrefix: "workable",
  },
  {
    provider: "lever",
    patterns: [
      /\bcandidatura\s+via\s+lever\b/,
      /\bapplication\s+via\s+lever\b/,
      /\bpowered\s+by\s+lever\b/,
    ],
    reasonPrefix: "lever",
  },
  {
    provider: "linkedin",
    patterns: [
      /\bcandidatura\s+via\s+linkedin\b/,
      /\bapply\s+via\s+linkedin\b/,
      /\bapply\s+with\s+linkedin\b/,
      /\bapplication\s+via\s+linkedin\b/,
    ],
    reasonPrefix: "linkedin",
  },
];

/**
 * Infere o ATS / canal de candidatura a partir do texto visível do modal (sem manipular DOM de terceiros).
 */
export function detectApplyProviderFromModal(modalRoot: HTMLElement): ApplyProviderDetection {
  const n = normalizeApplyProviderSourceText(modalPlainText(modalRoot));
  if (!n) {
    return { provider: "unknown", reason: "empty_modal_sample" };
  }

  for (const rule of PROVIDER_RULES) {
    for (let i = 0; i < rule.patterns.length; i++) {
      if (rule.patterns[i]!.test(n)) {
        return { provider: rule.provider, reason: `${rule.reasonPrefix}:pattern_${i}` };
      }
    }
  }

  return { provider: "unknown", reason: "no_provider_phrase" };
}
