import { cn } from "@/lib/cn";

/** Shared form-control surface for ApplyFlow (inputs, selects, textareas). */
export const applyFlowControlClass = cn(
  "w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2.5 text-sm text-[color:var(--af-text)]",
  "placeholder:text-[color:var(--af-text-muted)]",
  "transition-[border-color,box-shadow]",
  "focus-visible:border-emerald-500/40 focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const applyFlowControlErrorClass =
  "border-[color:var(--af-danger)] focus-visible:outline-[color:var(--af-danger)]";

/** Compact filter selects in toolbars. */
export const applyFlowFilterSelectClass = cn(
  applyFlowControlClass,
  "min-w-[130px] grow bg-[color:var(--af-bg-soft)]",
);

export const applyFlowTextareaClass = cn(applyFlowControlClass, "min-h-[5.5rem] resize-y leading-relaxed");
