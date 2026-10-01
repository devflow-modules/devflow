import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function ApplyFlowEmptyState({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondary,
  variant = "default",
  compact = false,
  className,
}: {
  title: string;
  description: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondary?: ReactNode;
  variant?: "default" | "warning";
  compact?: boolean;
  className?: string;
}) {
  return (
    <ApplyFlowCard
      variant={variant === "warning" ? "warning" : "muted"}
      padding={compact ? "md" : "lg"}
      className={cn(compact ? "text-left" : "text-center", className)}
      data-testid="applyflow-empty-state"
    >
      <p className={cn("font-medium text-[color:var(--af-text)]", compact ? "text-sm" : "text-sm")}>{title}</p>
      <p
        className={cn(
          "mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]",
          compact ? "max-w-none" : "mx-auto max-w-md",
        )}
      >
        {description}
      </p>
      {primaryLabel && onPrimary ? (
        <div className={cn("mt-4 flex flex-wrap gap-3", compact ? "justify-start" : "mt-5 justify-center")}>
          <ApplyFlowButton type="button" variant="outlineBrand" size={compact ? "sm" : "md"} onClick={onPrimary}>
            {primaryLabel}
          </ApplyFlowButton>
        </div>
      ) : null}
      {secondary ? (
        <div className={cn("mt-3 flex flex-wrap gap-2", compact ? "justify-start" : "mt-4 justify-center")}>
          {secondary}
        </div>
      ) : null}
    </ApplyFlowCard>
  );
}
