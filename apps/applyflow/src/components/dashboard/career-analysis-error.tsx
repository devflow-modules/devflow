import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import {
  CAREER_PILOT_ERROR_DESCRIPTION,
  CAREER_PILOT_ERROR_TITLE,
} from "./career-pilot-content";

export function CareerAnalysisError({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--af-radius-sm)] border border-amber-500/30 bg-amber-950/20 px-4 py-4"
      data-testid="career-pilot-analysis-error"
    >
      <p className="text-sm font-semibold text-[color:var(--af-text)]">{CAREER_PILOT_ERROR_TITLE}</p>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
        {CAREER_PILOT_ERROR_DESCRIPTION}
      </p>
      {onRetry ? (
        <ApplyFlowButton
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={onRetry}
          data-testid="career-pilot-analysis-retry"
        >
          Tentar novamente
        </ApplyFlowButton>
      ) : null}
    </div>
  );
}
