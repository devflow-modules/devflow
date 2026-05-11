/** Estado de sessão puramente incremental (facilita teste sem React). */

export type AutofillSessionCounters = {
  filled: number;
  failed: number;
  blocked: number;
};

export type AutofillSessionOutcome = "success" | "failed" | "blocked";

export function bumpAutofillSession(
  counters: AutofillSessionCounters,
  outcome: AutofillSessionOutcome,
): AutofillSessionCounters {
  if (outcome === "success") return { ...counters, filled: counters.filled + 1 };
  if (outcome === "failed") return { ...counters, failed: counters.failed + 1 };
  return { ...counters, blocked: counters.blocked + 1 };
}

export function emptyAutofillSession(): AutofillSessionCounters {
  return { filled: 0, failed: 0, blocked: 0 };
}
