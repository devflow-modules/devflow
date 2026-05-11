import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ReactNode } from "react";

export function ApplyFlowEmptyState({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondary,
  variant = "default",
}: {
  title: string;
  description: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondary?: ReactNode;
  variant?: "default" | "warning";
}) {
  return (
    <ApplyFlowCard variant={variant === "warning" ? "warning" : "muted"} padding="lg" className="text-center">
      <p className="text-sm font-medium text-[color:var(--af-text)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[color:var(--af-text-muted)]">{description}</p>
      {primaryLabel && onPrimary ? (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <ApplyFlowButton type="button" variant="outlineBrand" onClick={onPrimary}>
            {primaryLabel}
          </ApplyFlowButton>
        </div>
      ) : null}
      {secondary ? <div className="mt-4 flex flex-wrap justify-center gap-2">{secondary}</div> : null}
    </ApplyFlowCard>
  );
}
