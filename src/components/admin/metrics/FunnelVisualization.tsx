type FunnelStep = {
  label: string;
  value: number;
  key: string;
};

type FunnelVisualizationProps = {
  steps: FunnelStep[];
  className?: string;
};

export function FunnelVisualization({ steps, className = "" }: FunnelVisualizationProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} role="list" aria-label="Funil de conversão">
      {steps.map((step, index) => (
        <div key={step.key} className="flex flex-col gap-1" role="listitem">
          {index > 0 && (
            <div className="flex justify-center text-muted-foreground" aria-hidden>
              ↓
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium text-foreground">{step.label}</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {step.value.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
