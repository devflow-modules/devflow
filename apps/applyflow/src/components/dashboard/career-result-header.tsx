import type { CareerChatIntent } from "@devflow/career-core";
import { isCareerPilotIntent } from "./career-pilot-content";
import { CAREER_PILOT_RESULT_COMPLETION } from "./career-pilot-content";
import type { CareerPilotScoreItem } from "./career-pilot-result-mapper";
import { CareerScoreIndicator } from "./career-score-indicator";

export function careerPilotCompletionMessage(
  intent: CareerChatIntent,
  flowTitle: string,
): string {
  if (isCareerPilotIntent(intent)) {
    return CAREER_PILOT_RESULT_COMPLETION[intent];
  }
  return `${flowTitle} concluída`;
}

export function CareerResultHeader({
  flowTitle,
  completionMessage,
  primaryScore,
}: {
  flowTitle: string;
  completionMessage: string;
  primaryScore?: CareerPilotScoreItem;
}) {
  return (
    <header className="space-y-4 border-b border-[color:var(--af-border)] pb-4" data-testid="career-pilot-result-header">
      <div className="space-y-1">
        <p className="text-sm font-medium text-emerald-300/90">{completionMessage}</p>
        <h3 className="text-lg font-semibold text-[color:var(--af-text)] sm:text-xl">{flowTitle}</h3>
      </div>
      {primaryScore ? (
        <div className="max-w-md">
          <CareerScoreIndicator score={primaryScore} />
        </div>
      ) : null}
    </header>
  );
}
