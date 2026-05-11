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
      <h2
        className={cn(
          "text-xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-2xl",
          eyebrow ? "mt-3" : "",
        )}
      >
        {title}
      </h2>
      {description ? (
        <div className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--af-text-muted)] sm:text-[15px] sm:leading-relaxed">
          {description}
        </div>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
