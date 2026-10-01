import { cn } from "@/lib/cn";

export function ApplyFlowLoadingState({
  label = "A carregar…",
  compact = false,
  className,
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 text-[color:var(--af-text-muted)]",
        compact ? "justify-start py-2" : "justify-center py-8",
        className,
      )}
      data-testid="applyflow-loading"
    >
      <span
        className={cn(
          "inline-block rounded-full border-2 border-[color:var(--af-border-strong)] border-t-[color:var(--af-brand)]",
          compact ? "h-4 w-4" : "h-5 w-5",
          "motion-safe:animate-spin motion-reduce:animate-none",
        )}
        aria-hidden
      />
      <p className={cn(compact ? "text-xs" : "text-sm")}>{label}</p>
    </div>
  );
}
