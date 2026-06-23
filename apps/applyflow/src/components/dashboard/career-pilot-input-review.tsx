"use client";

import type { CareerChatIntent } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";
import { isCareerPilotIntent } from "./career-pilot-content";
import {
  CAREER_PILOT_REVIEW_AMBIGUOUS_HINT,
  CAREER_PILOT_REVIEW_AVAILABILITY_LABEL,
  CAREER_PILOT_REVIEW_DISCLOSURE_HINT,
  CAREER_PILOT_REVIEW_DISCLOSURE_TITLE,
  CAREER_PILOT_REVIEW_EXPERIENCES_LABEL,
  CAREER_PILOT_REVIEW_LOW_CONFIDENCE_HINT,
  CAREER_PILOT_REVIEW_PROJECTS_LABEL,
  CAREER_PILOT_REVIEW_REQUIREMENTS_LABEL,
  CAREER_PILOT_REVIEW_SKILLS_LABEL,
  CAREER_PILOT_REVIEW_SUMMARY_LABEL,
  CAREER_PILOT_REVIEW_TARGET_ROLE_LABEL,
  CAREER_PILOT_REVIEW_UNUSED_LABEL,
} from "./career-pilot-simple-input-content";
import { careerPolishInput, careerPolishLabel, careerPolishTextarea } from "./career-polish-classes";

function parseProjectsJson(value: string): string {
  try {
    const parsed = JSON.parse(value) as Array<{ name?: string; bullets?: string[] }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return "";
    }
    return parsed
      .map((project) => {
        const name = project.name?.trim() || "Projeto";
        const bullets = (project.bullets ?? []).join("\n");
        return bullets ? `${name}\n${bullets}` : name;
      })
      .join("\n\n");
  } catch {
    return "";
  }
}

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
  const projectsText = parseProjectsJson(fields.resumeProjectsJson);
  const unusedCount = Number.parseInt(fields.resumeUnusedInfoCount || "0", 10);

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

        {fields.resumeParseConfidence === "low" ? (
          <p className="text-sm text-amber-200/90" role="status">
            {CAREER_PILOT_REVIEW_LOW_CONFIDENCE_HINT}
          </p>
        ) : null}

        {unusedCount > 0 ? (
          <p className="text-sm text-[color:var(--af-text-muted)]" role="status">
            {CAREER_PILOT_REVIEW_AMBIGUOUS_HINT}
          </p>
        ) : null}

        {fields.resumeParseSummary ? (
          <p className="text-sm text-[color:var(--af-text-muted)]">{fields.resumeParseSummary}</p>
        ) : null}

        {showResume ? (
          <>
            {fields.resumeSummary.trim() ? (
              <>
                <label htmlFor="career-pilot-review-summary" className={careerPolishLabel}>
                  {CAREER_PILOT_REVIEW_SUMMARY_LABEL}
                </label>
                <textarea
                  id="career-pilot-review-summary"
                  className={careerPolishTextarea}
                  value={fields.resumeSummary}
                  onChange={(event) => onFieldChange("resumeSummary", event.target.value)}
                  data-testid="career-pilot-review-summary"
                />
              </>
            ) : null}

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

            {projectsText ? (
              <>
                <label htmlFor="career-pilot-review-projects" className={careerPolishLabel}>
                  {CAREER_PILOT_REVIEW_PROJECTS_LABEL}
                </label>
                <textarea
                  id="career-pilot-review-projects"
                  className={careerPolishTextarea}
                  value={projectsText}
                  readOnly
                  data-testid="career-pilot-review-projects"
                />
              </>
            ) : null}

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

            {unusedCount > 0 ? (
              <p className="text-sm text-[color:var(--af-text-muted)]">
                {CAREER_PILOT_REVIEW_UNUSED_LABEL}: {unusedCount}
              </p>
            ) : null}
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
