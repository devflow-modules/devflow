"use client";

const STEP_LABELS = ["Conectar WhatsApp", "Testar conexão", "Ir para Inbox"] as const;

type OnboardingProgressProps = {
  currentStep: 1 | 2 | 3;
  /** Quando o utilizador já enviou a primeira resposta na Inbox. */
  allComplete?: boolean;
};

export function OnboardingProgress({ currentStep, allComplete }: OnboardingProgressProps) {
  return (
    <nav aria-label="Progresso da ativação" className="mb-8">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3;
          const done = allComplete || currentStep > stepNum;
          const active = !allComplete && currentStep === stepNum;
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={`df-check-step ${
                  done
                    ? "df-check-step--done"
                    : active
                      ? "bg-[var(--df-brand-600)] text-white ring-2 ring-[var(--df-brand-200)]"
                      : "bg-muted df-text-muted"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : stepNum}
              </span>
              <span
                className={`text-xs font-medium sm:text-sm ${
                  active ? "df-text-primary" : done ? "df-text-success" : "df-text-muted"
                }`}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 ? (
                <span className="mx-1 hidden h-px min-w-[1rem] flex-1 bg-muted sm:block" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
