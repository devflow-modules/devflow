"use client";

import type { CareerChatIntent } from "@devflow/career-core";
import { isCareerPilotIntent } from "./career-pilot-content";
import {
  CAREER_PILOT_SIMPLE_AVAILABILITY_HINT,
  CAREER_PILOT_SIMPLE_AVAILABILITY_LABEL,
  CAREER_PILOT_SIMPLE_CAREER_GOAL_HINT,
  CAREER_PILOT_SIMPLE_CAREER_GOAL_LABEL,
  CAREER_PILOT_SIMPLE_CONSTRAINTS_HINT,
  CAREER_PILOT_SIMPLE_CONSTRAINTS_LABEL,
  CAREER_PILOT_SIMPLE_INPUT_PRIVACY,
  CAREER_PILOT_SIMPLE_JOB_HINT,
  CAREER_PILOT_SIMPLE_JOB_LABEL,
  CAREER_PILOT_SIMPLE_RESUME_HINT,
  CAREER_PILOT_SIMPLE_RESUME_LABEL,
  CAREER_PILOT_SIMPLE_TARGET_ROLE_HINT,
  CAREER_PILOT_SIMPLE_TARGET_ROLE_LABEL,
  CAREER_PILOT_SIMPLE_TARGET_ROLE_OPTIONAL,
} from "./career-pilot-simple-input-content";
import type { CareerPilotSimpleInputs } from "./career-pilot-simple-inputs";
import {
  careerPolishBodyText,
  careerPolishInput,
  careerPolishLabel,
  careerPolishResumeTextarea,
  careerPolishJobTextarea,
} from "./career-polish-classes";

export function CareerPilotSimpleInputsForm({
  intent,
  value,
  onChange,
}: {
  intent: CareerChatIntent;
  value: CareerPilotSimpleInputs;
  onChange: (next: CareerPilotSimpleInputs) => void;
}) {
  if (!isCareerPilotIntent(intent)) {
    return null;
  }

  function patch(partial: Partial<CareerPilotSimpleInputs>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4" data-testid="career-pilot-simple-inputs">
      {intent === "analyze_resume" ? (
        <>
          <div className="space-y-2">
            <label htmlFor="career-pilot-target-role" className={careerPolishLabel}>
              {CAREER_PILOT_SIMPLE_TARGET_ROLE_LABEL}{" "}
              <span className="font-normal text-[color:var(--af-text-muted)]">
                {CAREER_PILOT_SIMPLE_TARGET_ROLE_OPTIONAL}
              </span>
            </label>
            <p className={careerPolishBodyText}>{CAREER_PILOT_SIMPLE_TARGET_ROLE_HINT}</p>
            <input
              id="career-pilot-target-role"
              className={careerPolishInput}
              value={value.targetRole}
              onChange={(event) => patch({ targetRole: event.target.value })}
              data-testid="career-pilot-target-role"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="career-pilot-resume-text" className={careerPolishLabel}>
              {CAREER_PILOT_SIMPLE_RESUME_LABEL}
            </label>
            <p className={careerPolishBodyText}>{CAREER_PILOT_SIMPLE_RESUME_HINT}</p>
            <textarea
              id="career-pilot-resume-text"
              className={careerPolishResumeTextarea}
              value={value.resumeText}
              onChange={(event) => patch({ resumeText: event.target.value })}
              data-testid="career-pilot-resume-text"
            />
          </div>
        </>
      ) : null}

      {intent === "analyze_ats_compatibility" ? (
        <>
          <div className="space-y-2">
            <label htmlFor="career-pilot-resume-text" className={careerPolishLabel}>
              {CAREER_PILOT_SIMPLE_RESUME_LABEL}
            </label>
            <p className={careerPolishBodyText}>{CAREER_PILOT_SIMPLE_RESUME_HINT}</p>
            <textarea
              id="career-pilot-resume-text"
              className={careerPolishResumeTextarea}
              value={value.resumeText}
              onChange={(event) => patch({ resumeText: event.target.value })}
              data-testid="career-pilot-resume-text"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="career-pilot-job-description" className={careerPolishLabel}>
              {CAREER_PILOT_SIMPLE_JOB_LABEL}
            </label>
            <p className={careerPolishBodyText}>{CAREER_PILOT_SIMPLE_JOB_HINT}</p>
            <textarea
              id="career-pilot-job-description"
              className={careerPolishJobTextarea}
              value={value.jobDescription}
              onChange={(event) => patch({ jobDescription: event.target.value })}
              data-testid="career-pilot-job-description"
            />
          </div>
        </>
      ) : null}

      {intent === "plan_career_strategy" ? (
        <>
          <div className="space-y-2">
            <label htmlFor="career-pilot-career-goal" className={careerPolishLabel}>
              {CAREER_PILOT_SIMPLE_CAREER_GOAL_LABEL}
            </label>
            <p className={careerPolishBodyText}>{CAREER_PILOT_SIMPLE_CAREER_GOAL_HINT}</p>
            <textarea
              id="career-pilot-career-goal"
              className={careerPolishResumeTextarea}
              value={value.careerGoal}
              onChange={(event) => patch({ careerGoal: event.target.value })}
              data-testid="career-pilot-career-goal"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="career-pilot-weekly-availability" className={careerPolishLabel}>
              {CAREER_PILOT_SIMPLE_AVAILABILITY_LABEL}
            </label>
            <p className={careerPolishBodyText}>{CAREER_PILOT_SIMPLE_AVAILABILITY_HINT}</p>
            <input
              id="career-pilot-weekly-availability"
              className={careerPolishInput}
              value={value.weeklyAvailability}
              onChange={(event) => patch({ weeklyAvailability: event.target.value })}
              data-testid="career-pilot-weekly-availability"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="career-pilot-constraints" className={careerPolishLabel}>
              {CAREER_PILOT_SIMPLE_CONSTRAINTS_LABEL}
            </label>
            <p className={careerPolishBodyText}>{CAREER_PILOT_SIMPLE_CONSTRAINTS_HINT}</p>
            <input
              id="career-pilot-constraints"
              className={careerPolishInput}
              value={value.constraints}
              onChange={(event) => patch({ constraints: event.target.value })}
              data-testid="career-pilot-constraints"
            />
          </div>
        </>
      ) : null}

      <p role="note" className="text-sm text-[color:var(--af-text-muted)]" data-testid="career-pilot-input-privacy">
        {CAREER_PILOT_SIMPLE_INPUT_PRIVACY}
      </p>
    </div>
  );
}
