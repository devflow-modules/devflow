import type { CareerChatIntent } from "@devflow/career-core";
import { isCareerPilotIntent } from "./career-pilot-content";
import { careerPolishMotion } from "./career-polish-classes";

const LOADING_COPY: Record<
  Extract<CareerChatIntent, "analyze_resume" | "analyze_ats_compatibility" | "plan_career_strategy">,
  string
> = {
  analyze_resume: "Analisando a estrutura do seu currículo…",
  analyze_ats_compatibility: "Comparando seu perfil com a vaga…",
  plan_career_strategy: "Organizando seu plano de carreira…",
};

export function careerPilotLoadingMessage(intent: CareerChatIntent): string {
  if (!isCareerPilotIntent(intent)) {
    return "Processando sua análise…";
  }
  return LOADING_COPY[intent];
}

export function CareerAnalysisLoading({ intent }: { intent: CareerChatIntent }) {
  const message = careerPilotLoadingMessage(intent);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-4 py-4 ${careerPolishMotion}`}
      data-testid="career-pilot-analysis-loading"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-block h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--af-border-strong)] border-t-emerald-400 motion-reduce:animate-none motion-reduce:border-t-[color:var(--af-border-strong)]"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-[color:var(--af-text)]">Análise em andamento</p>
          <p className="text-sm text-[color:var(--af-text-muted)]">{message}</p>
        </div>
      </div>
    </div>
  );
}
