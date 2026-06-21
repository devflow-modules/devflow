"use client";

import { cn } from "@/lib/cn";
import type { CareerChatIntent } from "@devflow/career-core";
import { CAREER_PILOT_JOURNEY_STEPS, isCareerPilotIntent } from "./career-pilot-content";

export function CareerPilotJourney({ activeIntent }: { activeIntent: CareerChatIntent }) {
  const resolvedIntent = isCareerPilotIntent(activeIntent) ? activeIntent : "analyze_resume";

  return (
    <nav
      aria-label="Progresso da jornada do piloto"
      className="flex flex-wrap gap-2"
      data-testid="career-pilot-journey-nav"
    >
      {CAREER_PILOT_JOURNEY_STEPS.map((step, index) => {
        const isActive = step.intent === resolvedIntent;
        const stepIndex = CAREER_PILOT_JOURNEY_STEPS.findIndex((s) => s.intent === resolvedIntent);
        const isComplete = index < stepIndex;

        return (
          <span
            key={step.intent}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium",
              isActive
                ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-100"
                : isComplete
                  ? "border-emerald-500/25 text-emerald-300/80"
                  : "border-[color:var(--af-border-strong)] text-[color:var(--af-text-muted)]",
            )}
            aria-current={isActive ? "step" : undefined}
          >
            {index + 1}. {step.label}
          </span>
        );
      })}
    </nav>
  );
}
