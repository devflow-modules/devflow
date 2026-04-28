"use client";

import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import { productModeBadgeLabel } from "@/lib/roleProductLabels";

type Props = {
  variant?: "header" | "sidebar";
};

/**
 * Indicador discreto do modo de sessão (copy de produto — não altera permissões).
 */
export function SessionRoleModePill({ variant = "header" }: Props) {
  const { role, loading } = useSessionRole();
  if (loading || !role) return null;
  const label = productModeBadgeLabel(role);

  if (variant === "sidebar") {
    return (
      <p
        className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--df-text-muted)]"
        data-testid="session-role-mode-sidebar"
      >
        {label}
      </p>
    );
  }

  return (
    <span
      className="hidden max-w-[9rem] truncate rounded-full border df-border-brand bg-[var(--df-bg-elevated)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)] min-[430px]:inline-flex"
      title={label}
      data-testid="session-role-mode-header"
    >
      {label}
    </span>
  );
}
