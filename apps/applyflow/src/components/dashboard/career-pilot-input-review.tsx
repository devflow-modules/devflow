"use client";

import type { CareerChatIntent } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";
import { isCareerPilotIntent } from "./career-pilot-content";
import {
  CAREER_PILOT_REVIEW_AVAILABILITY_LABEL,
  CAREER_PILOT_REVIEW_DISCLOSURE_HINT,
  CAREER_PILOT_REVIEW_DISCLOSURE_TITLE,
  CAREER_PILOT_REVIEW_EXPERIENCES_LABEL,
  CAREER_PILOT_REVIEW_REQUIREMENTS_LABEL,
  CAREER_PILOT_REVIEW_SKILLS_LABEL,
  CAREER_PILOT_REVIEW_TARGET_ROLE_LABEL,
} from "./career-pilot-simple-input-content";
import { careerPolishInput, careerPolishLabel, careerPolishTextarea } from "./career-polish-classes";

export function CareerPilotInputReview({
  intent,
  fields,
  onFieldChange,
}: {
  intent: CareerChatIntent;
  fields: CareerSpecialistFields;
  onFieldChange: (field: keyof CareerSpecialistFields, value: string) => void;
}) {
  if (!isCareerPilotIntent(intent)) {
    return null;
  }

  const showResume = intent !== "plan_career_strategy";
  const showJob = intent === "analyze_ats_compatibility";
  const showPlan = intent === "plan_career_strategy";

  return (
    <details
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)]"
      data-testid="career-pilot-input-review"
    >
      <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-[color:var(--af-text)] marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {CAREER_PILOT_REVIEW_DISCLOSURE_TITLE}
          <span aria-hidden className="text-[color:var(--af-text-muted)]">
            ▾
          </span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-[color:var(--af-border)] px-3 py-3">
        <p className="text-sm text-[color:var(--af-text-muted)]">{CAREER_PILOT_REVIEW_DISCLOSURE_HINT}</p>

        {showResume ? (
          <>
            <label htmlFor="career-pilot-review-experiences" className={careerPolishLabel}>
              {CAREER_PILOT_REVIEW_EXPERIENCES_LABEL}
            </label>
            <textarea
              id="career-pilot-review-experiences"
              className={careerPolishTextarea}
              value={fields.resumeBullets}
              onChange={(event) => onFieldChange("resumeBullets", event.target.value)}
              data-testid="career-pilot-review-experiences"
            />
            <label htmlFor="career-pilot-review-skills" className={careerPolishLabel}>
              {CAREER_PILOT_REVIEW_SKILLS_LABEL}
            </label>
            <input
              id="career-pilot-review-skills"
              className={careerPolishInput}
              value={fields.resumeSkills}
              onChange={(event) => onFieldChange("resumeSkills", event.target.value)}
              data-testid="career-pilot-review-skills"
            />
          </>
        ) : null}

        {showJob ? (
          <>
            <label htmlFor="career-pilot-review-requirements" className={careerPolishLabel}>
              {CAREER_PILOT_REVIEW_REQUIREMENTS_LABEL}
            </label>
            <textarea
              id="career-pilot-review-requirements"
              className={careerPolishTextarea}
              value={fields.jobRequirements}
              onChange={(event) => onFieldChange("jobRequirements", event.target.value)}
              data-testid="career-pilot-review-requirements"
            />
          </>
        ) : null}

        {showPlan ? (
          <>
            <label htmlFor="career-pilot-review-target-roles" className={careerPolishLabel}>
              {CAREER_PILOT_REVIEW_TARGET_ROLE_LABEL}
            </label>
            <input
              id="career-pilot-review-target-roles"
              className={careerPolishInput}
              value={fields.targetRoles}
              onChange={(event) => onFieldChange("targetRoles", event.target.value)}
              data-testid="career-pilot-review-target-roles"
            />
            <label htmlFor="career-pilot-review-availability" className={careerPolishLabel}>
              {CAREER_PILOT_REVIEW_AVAILABILITY_LABEL}
            </label>
            <input
              id="career-pilot-review-availability"
              className={careerPolishInput}
              value={fields.availability}
              onChange={(event) => onFieldChange("availability", event.target.value)}
              data-testid="career-pilot-review-availability"
            />
          </>
        ) : null}

        {!showPlan && fields.targetRoles.trim() ? (
          <>
            <label htmlFor="career-pilot-review-role" className={careerPolishLabel}>
              {CAREER_PILOT_REVIEW_TARGET_ROLE_LABEL}
            </label>
            <input
              id="career-pilot-review-role"
              className={careerPolishInput}
              value={fields.targetRoles}
              onChange={(event) => onFieldChange("targetRoles", event.target.value)}
              data-testid="career-pilot-review-role"
            />
          </>
        ) : null}
      </div>
    </details>
  );
}
