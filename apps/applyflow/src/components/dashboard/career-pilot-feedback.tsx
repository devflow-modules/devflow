"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { useState } from "react";
import type { CareerFeedbackRating } from "./career-chat-workspace-client";
import {
  CAREER_PILOT_FEEDBACK_CONSENT_LABEL,
  CAREER_PILOT_FEEDBACK_ERROR,
  CAREER_PILOT_FEEDBACK_HELPFUL_LABEL,
  CAREER_PILOT_FEEDBACK_INTRO,
  CAREER_PILOT_FEEDBACK_NOT_HELPFUL_LABEL,
  CAREER_PILOT_FEEDBACK_PARTIAL_LABEL,
  CAREER_PILOT_FEEDBACK_PROMPT,
  CAREER_PILOT_FEEDBACK_SUBMIT_LABEL,
  CAREER_PILOT_FEEDBACK_THANKS,
} from "./career-pilot-result-content";

export function CareerPilotFeedback({
  onSubmit,
}: {
  onSubmit: (input: {
    rating: CareerFeedbackRating;
    consentToStore: boolean;
  }) => Promise<{ ok: boolean }>;
}) {
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedRating, setSelectedRating] = useState<CareerFeedbackRating | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!consentChecked || !selectedRating || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onSubmit({
        rating: selectedRating,
        consentToStore: true,
      });
      if (!result.ok) {
        setErrorMessage(CAREER_PILOT_FEEDBACK_ERROR);
        return;
      }
      setSubmitted(true);
    } catch {
      setErrorMessage(CAREER_PILOT_FEEDBACK_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p role="status" className="text-sm text-emerald-200/90" data-testid="career-pilot-feedback-thanks">
        {CAREER_PILOT_FEEDBACK_THANKS}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="career-pilot-feedback">
      <p className="text-sm text-[color:var(--af-text-muted)]">{CAREER_PILOT_FEEDBACK_INTRO}</p>
      <p className="text-sm font-medium text-[color:var(--af-text)]">{CAREER_PILOT_FEEDBACK_PROMPT}</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label={CAREER_PILOT_FEEDBACK_PROMPT}>
        <ApplyFlowButton
          type="button"
          variant={selectedRating === "helpful" ? "primary" : "outlineBrand"}
          size="sm"
          aria-pressed={selectedRating === "helpful"}
          onClick={() => setSelectedRating("helpful")}
          data-testid="career-pilot-feedback-helpful"
        >
          {CAREER_PILOT_FEEDBACK_HELPFUL_LABEL}
        </ApplyFlowButton>
        <ApplyFlowButton
          type="button"
          variant={selectedRating === "partially_helpful" ? "primary" : "ghost"}
          size="sm"
          aria-pressed={selectedRating === "partially_helpful"}
          onClick={() => setSelectedRating("partially_helpful")}
          data-testid="career-pilot-feedback-partial"
        >
          {CAREER_PILOT_FEEDBACK_PARTIAL_LABEL}
        </ApplyFlowButton>
        <ApplyFlowButton
          type="button"
          variant={selectedRating === "not_helpful" ? "primary" : "ghost"}
          size="sm"
          aria-pressed={selectedRating === "not_helpful"}
          onClick={() => setSelectedRating("not_helpful")}
          data-testid="career-pilot-feedback-not-helpful"
        >
          {CAREER_PILOT_FEEDBACK_NOT_HELPFUL_LABEL}
        </ApplyFlowButton>
      </div>

      <label className="flex items-start gap-2 text-sm text-[color:var(--af-text-muted)]">
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(event) => setConsentChecked(event.target.checked)}
          data-testid="career-pilot-feedback-consent"
        />
        <span>{CAREER_PILOT_FEEDBACK_CONSENT_LABEL}</span>
      </label>

      <ApplyFlowButton
        type="button"
        variant="outlineBrand"
        size="sm"
        disabled={!consentChecked || !selectedRating || isSubmitting}
        onClick={() => {
          void handleSubmit();
        }}
        data-testid="career-pilot-feedback-submit"
      >
        {isSubmitting ? "Enviando…" : CAREER_PILOT_FEEDBACK_SUBMIT_LABEL}
      </ApplyFlowButton>

      {errorMessage ? (
        <p role="alert" className="text-sm text-amber-200/90" data-testid="career-pilot-feedback-error">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
