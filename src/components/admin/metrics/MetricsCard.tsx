type MetricsCardProps = {
  label: string;
  value: number | string;
  className?: string;
};

export function MetricsCard({ label, value, className = "" }: MetricsCardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
    </div>
  );
}
