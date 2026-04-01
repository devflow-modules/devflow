import { cn } from "@/lib/utils";

/** Cards de demo / resultado — borda e raio alinhados ao ecossistema */
export const demoCardClass = (extra?: string) =>
  cn("rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8", extra);

/** Selo / eyebrow acima do título (produto · demo) */
export const demoEyebrowClass = cn(
  "inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1",
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
);

/** CTA principal: ação principal da demo ou conversão in-site */
export const demoCtaPrimaryClass = cn(
  "inline-flex h-11 min-h-[2.75rem] w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold",
  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
);

/** CTA secundário: navegação, site externo, alternativa */
export const demoCtaSecondaryClass = cn(
  "inline-flex h-11 min-h-[2.75rem] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground",
  "transition-colors hover:bg-muted/60",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "sm:w-auto"
);

/** Painel de sucesso / resultado positivo (demo ou API) */
export const demoSuccessPanelClass = cn(
  "rounded-xl border border-emerald-200/90 bg-emerald-50/65 p-4",
  "dark:border-emerald-900/55 dark:bg-emerald-950/30"
);

/** Alerta informativo discreto */
export const demoAssistPanelClass = cn(
  "rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground"
);

/** Seção com fundo suave entre blocos de produto */
export const demoSectionMutedClass = "border-t border-border bg-muted/20 py-14 sm:py-20";
