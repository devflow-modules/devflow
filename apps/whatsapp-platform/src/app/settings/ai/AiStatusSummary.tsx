/**
 * Resumo operacional da IA — leitura em ~1s, sem chamadas extra.
 */
export function AiStatusSummary(props: { enabled: boolean; autoReply: boolean; motorLabel: string; className?: string }) {
  const { enabled, autoReply, motorLabel, className = "" } = props;

  return (
    <div
      className={`space-y-2 rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2.5 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)] ${className}`.trim()}
      role="status"
      aria-label="Estado operacional da IA"
    >
      <div className="flex flex-wrap items-center gap-2">
        {enabled ? (
          <span className="df-badge-success whitespace-nowrap">IA ativa</span>
        ) : (
          <span className="df-badge whitespace-nowrap">IA desativada</span>
        )}
        {enabled ? (
          autoReply ? (
            <span className="df-badge-success whitespace-nowrap">Auto-resposta ligada</span>
          ) : (
            <span className="df-badge whitespace-nowrap">Auto-resposta desligada</span>
          )
        ) : (
          <span className="df-badge whitespace-nowrap text-[var(--df-text-muted)]">Auto-resposta —</span>
        )}
        {!enabled ? (
          <span className="df-badge whitespace-nowrap">Modo inativo</span>
        ) : autoReply ? (
          <span className="df-badge-brand whitespace-nowrap">Modo automático</span>
        ) : (
          <span className="df-badge whitespace-nowrap">Modo assistido</span>
        )}
      </div>
      <p className="text-xs text-[var(--df-text-muted)]">
        Motor efectivo: <span className="font-medium text-[var(--df-text-secondary)]">{motorLabel}</span>
      </p>
    </div>
  );
}
