import type { ReactNode } from "react";

type MetricsSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function MetricsSection({ title, children, className = "" }: MetricsSectionProps) {
  return (
    <section className={`space-y-4 ${className}`} aria-labelledby={`section-${title.replace(/\s+/g, "-")}`}>
      <h2
        id={`section-${title.replace(/\s+/g, "-")}`}
        className="text-lg font-semibold text-foreground"
      >
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}
