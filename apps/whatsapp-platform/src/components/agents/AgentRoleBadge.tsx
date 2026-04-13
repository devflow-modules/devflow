import { friendlyRoleLabel } from "@/lib/role-presentation";

type AgentRoleBadgeProps = {
  role: string | null | undefined;
  /** `compact` = menor que o nome da pessoa (linha de título). */
  size?: "default" | "compact";
  className?: string;
};

/**
 * Papel na equipa — neutro, para não competir com o estado operacional (cores de presença).
 */
export function AgentRoleBadge({ role, size = "default", className = "" }: AgentRoleBadgeProps) {
  const label = friendlyRoleLabel(role);
  const sizeClass =
    size === "compact"
      ? "h-[1.375rem] px-1.5 py-0 text-[11px] font-medium leading-none"
      : "h-6 px-2 py-0.5 text-xs font-medium";

  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center rounded-md border border-slate-200/90 bg-slate-100/90 text-slate-600 shadow-none ${sizeClass} ${className}`.trim()}
      title={label}
    >
      {label}
    </span>
  );
}
