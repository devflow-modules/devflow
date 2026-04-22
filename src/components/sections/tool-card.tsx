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
  /** Disparado ao clicar no card (antes da navegação). */
  onCtaNavigate?: () => void;
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
  onCtaNavigate,
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
      <h2
        className={cn(
          "mt-4 text-lg font-semibold",
          disabled ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-2 flex-1 text-sm",
          disabled ? "text-muted-foreground" : "text-slate-600"
        )}
      >
        {description}
      </p>
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
    disabled && "border-dashed border-slate-200/90 bg-slate-50/40 opacity-75"
  );

  if (disabled) {
    return (
      <article className={cardClass} aria-label={`${title} — em desenvolvimento`}>
        {content}
        <p className="mt-4 text-xs font-medium text-muted-foreground">Em desenvolvimento</p>
      </article>
    );
  }

  return (
    <Link href={href} className={cardClass} onClick={onCtaNavigate}>
      {content}
    </Link>
  );
}
