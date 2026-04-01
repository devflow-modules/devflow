"use client";

import { cn } from "@/modules/financeiro/lib/cn";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function FinanceiroSectionCard({ title, description, children, className }: Props) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <div className="mb-3 sm:mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
