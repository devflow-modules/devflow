import type { ReactNode } from "react";

type EmptyStateTone = "default" | "positive" | "muted";

const toneClass: Record<EmptyStateTone, string> = {
  default: "border-slate-200/90 bg-white/95",
  positive: "border-emerald-200/70 bg-emerald-50/40",
  muted: "border-slate-200/70 bg-slate-50/80",
};

export type EmptyStateProps = {
  title: string;
  description: string;
  /** Ícone ou ilustração opcional (24–40px) */
  icon?: ReactNode;
  action?: ReactNode;
  tone?: EmptyStateTone;
  className?: string;
};

/**
 * Estado vazio reutilizável — mensagens claras e tom positivo por defeito.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  tone = "default",
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${toneClass[tone]} ${className}`.trim()}
      role="status"
    >
      {icon ? <div className="mb-3 flex justify-center text-slate-400 [&_svg]:h-8 [&_svg]:w-8">{icon}</div> : null}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="df-text-muted mx-auto mt-1.5 max-w-md text-sm leading-relaxed">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
