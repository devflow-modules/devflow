"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  PROFILE_FORM_CANCEL_LABEL,
  PROFILE_FORM_COMFORT_NO,
  PROFILE_FORM_COMFORT_UNKNOWN,
  PROFILE_FORM_COMFORT_YES,
  PROFILE_FORM_ENGLISH_UNKNOWN,
  PROFILE_FORM_HINT,
  PROFILE_FORM_SALARY_SUMMARY,
  PROFILE_FORM_SAVE_LABEL,
  PROFILE_FORM_SKILLS_HINT,
  PROFILE_FORM_SKILLS_LEGEND,
  PROFILE_SKILL_LABELS,
} from "@/components/dashboard/candidate-profile-form-content";
import {
  APPLYFLOW_SKILL_KEYS,
  CANDIDATE_SALARY_KEYS,
  ENGLISH_LEVELS,
  candidateProfileFromDraft,
  draftFromCandidateProfile,
  emptyCandidateProfileDraft,
  type CandidateProfile,
  type CandidateProfileDraft,
} from "@devflow/applyflow-core";
import { AdditionalEvidenceEditor, type AdditionalEvidenceJobScope } from "@/components/dashboard/additional-evidence-editor";
import { useState } from "react";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  "w-full min-w-0 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm text-[color:var(--af-text)]",
  "placeholder:text-[color:var(--af-text-muted)] focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
);

const SALARY_LABELS: Record<(typeof CANDIDATE_SALARY_KEYS)[number], string> = {
  cltPleno: "CLT pleno",
  cltSenior: "CLT sénior",
  pjSenior: "PJ sénior",
  usdMonthly: "USD mensal",
  usdHourly: "USD hora",
};

export function CandidateProfileForm({
  initialProfile,
  error,
  jobScopes,
  onCancel,
  onSave,
}: {
  initialProfile?: CandidateProfile;
  error?: string | null;
  jobScopes?: AdditionalEvidenceJobScope[];
  onCancel: () => void;
  onSave: (profile: CandidateProfile) => { ok: boolean; error?: string };
}) {
  const [draft, setDraft] = useState<CandidateProfileDraft>(() =>
    initialProfile ? draftFromCandidateProfile(initialProfile) : emptyCandidateProfileDraft(),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = localError ?? error ?? null;

  return (
    <ApplyFlowCard padding="md">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const profile = candidateProfileFromDraft(draft, initialProfile);
            const result = onSave(profile);
            if (!result.ok) {
              setLocalError(result.error ?? "Não foi possível guardar o perfil.");
              return;
            }
            setLocalError(null);
          } catch (err) {
            setLocalError(err instanceof Error ? err.message : "Perfil inválido.");
          }
        }}
      >
        <p className="text-sm leading-relaxed text-[color:var(--af-text-muted)]">{PROFILE_FORM_HINT}</p>

        <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
          Nome
          <input
            required
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className={fieldClass}
            autoComplete="name"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
          Cargo ou área de interesse
          <input
            required
            value={draft.role}
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            className={fieldClass}
            placeholder="Product Engineer"
            autoComplete="organization-title"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
          Localização
          <input
            value={draft.location}
            onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            className={fieldClass}
            placeholder="Opcional"
            autoComplete="off"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            Inglês
            <select
              value={draft.englishLevel}
              onChange={(event) =>
                setDraft({ ...draft, englishLevel: event.target.value as CandidateProfileDraft["englishLevel"] })
              }
              className={fieldClass}
            >
              <option value="">{PROFILE_FORM_ENGLISH_UNKNOWN}</option>
              {ENGLISH_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            Confortável a trabalhar em inglês
            <select
              value={draft.comfortableInEnglish}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  comfortableInEnglish: event.target.value as CandidateProfileDraft["comfortableInEnglish"],
                })
              }
              className={fieldClass}
            >
              <option value="">{PROFILE_FORM_COMFORT_UNKNOWN}</option>
              <option value="yes">{PROFILE_FORM_COMFORT_YES}</option>
              <option value="no">{PROFILE_FORM_COMFORT_NO}</option>
            </select>
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-[color:var(--af-text)]">{PROFILE_FORM_SKILLS_LEGEND}</legend>
          <p className="text-xs text-[color:var(--af-text-muted)]">{PROFILE_FORM_SKILLS_HINT}</p>
          <div className="grid gap-2">
            {APPLYFLOW_SKILL_KEYS.map((key) => {
              const entry = draft.skills[key];
              return (
                <div
                  key={key}
                  className="grid grid-cols-[auto_1fr_5.5rem] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_6.5rem]"
                >
                  <input
                    type="checkbox"
                    checked={entry.selected}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        skills: {
                          ...draft.skills,
                          [key]: { ...entry, selected: event.target.checked },
                        },
                      })
                    }
                    aria-label={PROFILE_SKILL_LABELS[key]}
                  />
                  <span className="min-w-0 truncate text-sm text-[color:var(--af-text)]">{PROFILE_SKILL_LABELS[key]}</span>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    inputMode="numeric"
                    disabled={!entry.selected}
                    value={entry.years}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        skills: {
                          ...draft.skills,
                          [key]: { ...entry, years: event.target.value },
                        },
                      })
                    }
                    className={fieldClass}
                    placeholder="anos"
                    aria-label={`Anos em ${PROFILE_SKILL_LABELS[key]}`}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        <details className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-emerald-300 hover:text-emerald-200">
            {PROFILE_FORM_SALARY_SUMMARY}
          </summary>
          <div className="mt-3 grid gap-3">
            {CANDIDATE_SALARY_KEYS.map((key) => (
              <label key={key} className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
                {SALARY_LABELS[key]}
                <input
                  value={draft.salary[key]}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      salary: { ...draft.salary, [key]: event.target.value },
                    })
                  }
                  className={fieldClass}
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        </details>

        <AdditionalEvidenceEditor
          evidence={draft.evidence}
          jobScopes={jobScopes}
          onChange={(evidence) => setDraft({ ...draft, evidence })}
        />

        {shownError ? (
          <p className="text-sm text-red-200" role="alert">
            {shownError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <ApplyFlowButton type="submit" variant="primary" size="md">
            {PROFILE_FORM_SAVE_LABEL}
          </ApplyFlowButton>
          <ApplyFlowButton type="button" variant="ghost" size="md" onClick={onCancel}>
            {PROFILE_FORM_CANCEL_LABEL}
          </ApplyFlowButton>
        </div>
      </form>
    </ApplyFlowCard>
  );
}
