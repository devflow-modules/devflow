import * as React from "react";
import { cn } from "./lib/cn";

type FeatureCardProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
};

export function FeatureCard({
  title,
  description,
  icon,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-6",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]",
        className
      )}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary">
          {icon}
        </div>
      )}
      <h3 className={cn("font-medium text-foreground", icon && "mt-4")}>
        {title}
      </h3>
      <p className="mt-2 text-sm df-text-secondary">{description}</p>
    </article>
  );
}
