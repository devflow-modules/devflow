"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  CAREER_PILOT_CTA_LABEL,
  CAREER_PILOT_JOURNEY_STEPS,
  CAREER_PILOT_ONBOARDING_DESCRIPTION,
  CAREER_PILOT_ONBOARDING_TITLE,
  CAREER_PILOT_PRIVACY_NOTICE,
  CAREER_PILOT_WORKSPACE_ID,
} from "./career-pilot-content";

export function CareerPilotOnboarding() {
  function scrollToWorkspace() {
    document.getElementById(CAREER_PILOT_WORKSPACE_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <ApplyFlowCard
      variant="default"
      padding="lg"
      className="border border-emerald-500/25 bg-emerald-950/10"
      data-testid="career-pilot-onboarding"
    >
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-[color:var(--af-text)] sm:text-xl">
          {CAREER_PILOT_ONBOARDING_TITLE}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          {CAREER_PILOT_ONBOARDING_DESCRIPTION}
        </p>

        <ol
          className="grid gap-2 sm:grid-cols-3"
          aria-label="Etapas da análise de carreira"
          data-testid="career-pilot-journey-steps"
        >
          {CAREER_PILOT_JOURNEY_STEPS.map((step, index) => (
            <li
              key={step.intent}
              className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-3 py-2.5"
            >
              <span className="text-[11px] font-medium text-emerald-400/90">{index + 1}.</span>{" "}
              <span className="text-sm text-[color:var(--af-text)]">{step.label}</span>
            </li>
          ))}
        </ol>

        <p
          role="note"
          className="rounded-[var(--af-radius-sm)] border border-emerald-500/20 bg-emerald-950/15 px-3 py-2 text-sm text-emerald-200/90"
          data-testid="career-pilot-privacy-notice"
        >
          {CAREER_PILOT_PRIVACY_NOTICE}
        </p>

        <ApplyFlowButton
          type="button"
          variant="primary"
          size="md"
          className="font-semibold"
          onClick={scrollToWorkspace}
          data-testid="career-pilot-start-cta"
        >
          {CAREER_PILOT_CTA_LABEL}
        </ApplyFlowButton>
      </div>
    </ApplyFlowCard>
  );
}
