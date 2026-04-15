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
        className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
        data-testid="session-role-mode-sidebar"
      >
        {label}
      </p>
    );
  }

  return (
    <span
      className="max-w-[9rem] truncate rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
      title={label}
      data-testid="session-role-mode-header"
    >
      {label}
    </span>
  );
}
