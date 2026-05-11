import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export function ApplyFlowSection({
  eyebrow,
  title,
  description,
  children,
  className,
  id,
}: HTMLAttributes<HTMLDivElement> & {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-400/85">{eyebrow}</p>
      ) : null}
      <h2 className={cn("text-xl font-semibold text-[color:var(--af-text)]", eyebrow ? "mt-2" : "")}>{title}</h2>
      {description ? (
        <div className="mt-3 text-sm leading-relaxed text-[color:var(--af-text-muted)]">{description}</div>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
