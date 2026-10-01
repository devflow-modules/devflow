/** Shared Tailwind classes for the Career Suite pilot polish surfaces. */
import { applyFlowControlClass, applyFlowTextareaClass } from "@/components/ui/apply-flow-control-classes";

export const careerPolishBodyText =
  "text-sm leading-relaxed text-[color:var(--af-text-muted)]";

export const careerPolishLabel =
  "text-sm font-medium text-[color:var(--af-text)]";

export const careerPolishInput = applyFlowControlClass;

export const careerPolishTextarea = applyFlowTextareaClass;

export const careerPolishResumeTextarea =
  `${applyFlowControlClass} min-h-[11.25rem] resize-y sm:min-h-[13.75rem]`;

export const careerPolishJobTextarea =
  `${applyFlowControlClass} min-h-[11.25rem] resize-y sm:min-h-[13.75rem] w-full`;

export const careerPolishSectionSurface =
  "rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)]";

export const careerPolishMotion =
  "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transition-none";
