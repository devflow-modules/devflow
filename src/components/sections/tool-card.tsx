import Link from "next/link";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCardProps = {
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  highlight?: boolean;
  disabled?: boolean;
};

export function ToolCard({
  icon: Icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  badge,
  badgeColor = "bg-primary/10 text-primary",
  title,
  description,
  cta,
  href,
  highlight = false,
  disabled = false,
}: ToolCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className={cn("flex size-10 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("size-5", iconColor)} aria-hidden />
        </div>
        {badge && (
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", badgeColor)}>
            {badge}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-slate-600">{description}</p>
      {!disabled && (
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          {cta}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      )}
    </>
  );

  const cardClass = cn(
    "group relative flex flex-col rounded-2xl border bg-card p-6",
    "transition-all duration-200",
    !disabled && "hover:-translate-y-1 hover:shadow-lg",
    highlight && "border-primary/30 bg-primary/[0.02]",
    !highlight && !disabled && "border-border",
    disabled && "border-dashed border-slate-200 bg-slate-50/50 opacity-80"
  );

  if (disabled) {
    return (
      <article className={cardClass} aria-disabled>
        {content}
      </article>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {content}
    </Link>
  );
}
