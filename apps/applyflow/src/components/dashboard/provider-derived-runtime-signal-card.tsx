import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import type { ProviderDerivedSignal } from "@devflow/career-sync";

export function ProviderDerivedRuntimeSignalCard({
  signal,
  selected,
  dismissed,
  checkboxId,
  onToggleSelection,
  onDismiss,
  onRestore,
}: {
  signal: ProviderDerivedSignal;
  selected: boolean;
  dismissed: boolean;
  checkboxId: string;
  onToggleSelection?: (signalId: string) => void;
  onDismiss?: (signalId: string) => void;
  onRestore?: (signalId: string) => void;
}) {
  return (
    <div
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/30 p-2"
      data-testid={`provider-derived-runtime-signal-card-${signal.id}`}
      data-signal-dismissed={dismissed ? "true" : "false"}
    >
      <div className="flex items-start gap-2">
        {!dismissed ? (
          <input
            id={checkboxId}
            type="checkbox"
            checked={selected}
            aria-label={`Select signal ${signal.kind} from ${signal.source}`}
            onChange={() => onToggleSelection?.(signal.id)}
            data-testid={`provider-derived-runtime-signal-checkbox-${signal.id}`}
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={dismissed ? undefined : checkboxId} className="block text-[color:var(--af-text)]">
            <span className="font-medium">{signal.source}</span> · {signal.kind}
          </label>
          <p>Occurred: {signal.occurredAt}</p>
          {signal.startsAt ? <p>Starts: {signal.startsAt}</p> : null}
          {signal.company ? <p>Company: {signal.company}</p> : null}
          <p>Confidence: {signal.confidence}</p>
          <p>Review required: yes</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {!dismissed ? (
          <ApplyFlowButton
            type="button"
            variant="outlineBrand"
            size="sm"
            aria-label={`Dismiss signal ${signal.kind}`}
            onClick={() => onDismiss?.(signal.id)}
            data-testid={`provider-derived-runtime-signal-dismiss-${signal.id}`}
          >
            Dismiss
          </ApplyFlowButton>
        ) : (
          <ApplyFlowButton
            type="button"
            variant="outlineBrand"
            size="sm"
            aria-label={`Restore signal ${signal.kind}`}
            onClick={() => onRestore?.(signal.id)}
            data-testid={`provider-derived-runtime-signal-restore-${signal.id}`}
          >
            Restore
          </ApplyFlowButton>
        )}
      </div>
    </div>
  );
}
