type Props = {
  pendingCount: number;
  threshold?: number;
};

/**
 * Alerta global quando há acúmulo de canais pendentes de ativação.
 */
export function PendingAlertBanner({ pendingCount, threshold = 10 }: Props) {
  if (pendingCount <= threshold) return null;

  return (
    <div
      role="status"
      data-testid="pending-accumulation-alert"
      className="df-feedback-warning"
    >
      <p className="font-medium">Muitos canais pendentes aguardando ativação</p>
      <p className="mt-1 opacity-95">
        {pendingCount} canais em <span className="font-mono">PENDING_ACTIVATION</span> (limite de alerta:{" "}
        {threshold}). Priorize a fila <strong>Pendentes</strong>.
      </p>
    </div>
  );
}
