"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { cn } from "@/lib/cn";
import type { CareerChatIntent } from "@devflow/career-core";
import type { CareerPilotIntent } from "./career-pilot-content";
import { CAREER_PILOT_JOURNEY_STEPS, isCareerPilotIntent } from "./career-pilot-content";

export function CareerJourneyStepper({
  activeIntent,
  completedIntents,
  onSelectIntent,
}: {
  activeIntent: CareerChatIntent;
  completedIntents: ReadonlySet<CareerPilotIntent>;
  onSelectIntent: (intent: CareerPilotIntent) => void;
}) {
  const resolvedIntent = isCareerPilotIntent(activeIntent) ? activeIntent : "analyze_resume";
  const activeIndex = CAREER_PILOT_JOURNEY_STEPS.findIndex((step) => step.intent === resolvedIntent);

  return (
    <nav
      aria-label="Progresso da jornada do piloto"
      className="w-full"
      data-testid="career-pilot-journey-nav"
    >
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        {CAREER_PILOT_JOURNEY_STEPS.map((step, index) => {
          const isActive = step.intent === resolvedIntent;
          const isComplete = completedIntents.has(step.intent);
          const state = isActive ? "active" : isComplete ? "completed" : "upcoming";

          return (
            <li key={step.intent} className="relative flex flex-1 items-stretch">
              {index > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute -left-px top-1/2 hidden h-px w-2 -translate-y-1/2 sm:block",
                    isComplete || index <= activeIndex
                      ? "bg-emerald-500/35"
                      : "bg-[color:var(--af-border)]",
                  )}
                />
              ) : null}
              <ApplyFlowButton
                type="button"
                variant={isActive ? "primary" : isComplete ? "secondary" : "ghost"}
                size="md"
                onClick={() => onSelectIntent(step.intent)}
                aria-current={isActive ? "step" : undefined}
                data-state={state}
                data-testid={`career-journey-step-${step.intent}`}
                className={cn(
                  "h-auto min-h-[4.5rem] w-full flex-col items-start justify-start gap-0.5 whitespace-normal py-2.5 text-left sm:min-h-[4.5rem]",
                  isActive && "ring-1 ring-emerald-500/20",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isActive
                        ? "bg-[color:var(--af-on-brand)]/15 text-[color:var(--af-on-brand)]"
                        : isComplete
                          ? "border border-emerald-500/40 text-emerald-300"
                          : "border border-[color:var(--af-border-strong)] text-[color:var(--af-text-muted)]",
                    )}
                  >
                    {isComplete && !isActive ? "✓" : index + 1}
                  </span>
                  <span className="text-sm font-semibold">{step.shortLabel}</span>
                </span>
                {step.description ? (
                  <span className="pl-8 text-sm leading-snug opacity-90">{step.description}</span>
                ) : null}
              </ApplyFlowButton>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
