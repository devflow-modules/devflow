import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import type { ProviderDerivedSignal } from "@devflow/career-sync";

function formatSignalKind(kind: ProviderDerivedSignal["kind"]): string {
  return kind.replaceAll("_", " ");
}

function formatConfidence(signal: ProviderDerivedSignal): string {
  if (signal.confidenceLevel) {
    return signal.confidenceLevel;
  }

  return String(signal.confidence);
}

export function ProviderInsightsTimelineSignalCard({
  signal,
}: {
  signal: ProviderDerivedSignal;
}) {
  return (
    <article
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/30 p-3"
      data-testid={`provider-insights-timeline-signal-card-${signal.id}`}
      aria-label={`${formatSignalKind(signal.kind)} from ${signal.source}`}
    >
      <div className="space-y-1 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <p className="text-[color:var(--af-text)]">
          <span className="font-medium capitalize">{signal.source}</span> ·{" "}
          <span className="font-medium">{formatSignalKind(signal.kind)}</span>
        </p>
        <p>Occurred: {signal.occurredAt}</p>
        {signal.startsAt ? <p>Starts: {signal.startsAt}</p> : null}
        {signal.company ? <p>Domain: {signal.company}</p> : null}
        <p>Confidence: {formatConfidence(signal)}</p>
        {signal.reason ? <p>Reason: {signal.reason}</p> : null}
        <p>Evidence count: {signal.sourceCount}</p>
        <ApplyFlowBadge tone="intel">Manual review</ApplyFlowBadge>
      </div>
    </article>
  );
}
