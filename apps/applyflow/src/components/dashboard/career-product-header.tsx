"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import {
  CAREER_PILOT_CTA_LABEL,
  CAREER_PILOT_EYEBROW,
  CAREER_PILOT_JOURNEY_STEPS,
  CAREER_PILOT_ONBOARDING_DESCRIPTION,
  CAREER_PILOT_ONBOARDING_TITLE,
  CAREER_PILOT_PRIVACY_NOTICE,
  CAREER_PILOT_WORKSPACE_ID,
} from "./career-pilot-content";
import { careerPolishMotion, careerPolishSectionSurface } from "./career-polish-classes";
import { CareerTrustNotice } from "./career-trust-notice";

export function CareerProductHeader() {
  function scrollToWorkspace() {
    document.getElementById(CAREER_PILOT_WORKSPACE_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <header
      className={`${careerPolishSectionSurface} space-y-5 p-5 sm:p-6 lg:p-7`}
      data-testid="career-pilot-onboarding"
    >
      <div className="space-y-3">
        <ApplyFlowBadge tone="brand" data-testid="career-product-eyebrow">
          {CAREER_PILOT_EYEBROW}
        </ApplyFlowBadge>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
          {CAREER_PILOT_ONBOARDING_TITLE}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--af-text-muted)] sm:text-base">
          {CAREER_PILOT_ONBOARDING_DESCRIPTION}
        </p>
      </div>

      <ol
        className="grid gap-3 sm:grid-cols-3"
        aria-label="Etapas da análise de carreira"
        data-testid="career-pilot-journey-steps"
      >
        {CAREER_PILOT_JOURNEY_STEPS.map((step, index) => (
          <li
            key={step.intent}
            className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-3"
          >
            <span className="text-sm font-semibold text-[color:var(--af-text)]">
              {index + 1}. {step.shortLabel}
            </span>
            {step.description ? (
              <p className="mt-1 text-sm leading-snug text-[color:var(--af-text-muted)]">
                {step.description}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      <CareerTrustNotice>{CAREER_PILOT_PRIVACY_NOTICE}</CareerTrustNotice>

      <ApplyFlowButton
        type="button"
        variant="primary"
        size="lg"
        className={`w-full font-semibold sm:w-auto ${careerPolishMotion}`}
        onClick={scrollToWorkspace}
        data-testid="career-pilot-start-cta"
      >
        {CAREER_PILOT_CTA_LABEL}
      </ApplyFlowButton>
    </header>
  );
}
