"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import {
  OFFICIAL_APPLY_URL_FIELD_HINT,
  OFFICIAL_APPLY_URL_FIELD_LABEL,
  OFFICIAL_APPLY_URL_INVALID,
  OFFICIAL_APPLY_URL_REMOVE_LABEL,
  OFFICIAL_APPLY_URL_SAVE_ERROR,
  OFFICIAL_APPLY_URL_SAVE_LABEL,
  OFFICIAL_APPLY_URL_SAVING,
} from "@/components/dashboard/job-inbox-content";
import { validateOfficialApplyUrl, type ApplyFlowJob } from "@devflow/applyflow-core";
import { useEffect, useId, useState } from "react";

export function OfficialApplyUrlField({
  job,
  onSaveOfficialApplyUrl,
  disabled = false,
}: {
  job: ApplyFlowJob;
  onSaveOfficialApplyUrl?: (jobId: string, url: string | null) => void | Promise<void>;
  disabled?: boolean;
}) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const saved = job.jobContext.officialApplyUrl ?? "";
  const [draft, setDraft] = useState(saved);
  const [clientError, setClientError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(job.jobContext.officialApplyUrl ?? "");
    setClientError(null);
    setPersistError(null);
  }, [job.id, job.jobContext.officialApplyUrl]);

  if (!onSaveOfficialApplyUrl) return null;

  const trimmedDraft = draft.trim();
  const unchanged = trimmedDraft === saved.trim();
  const canRemove = Boolean(saved) && !saving && !disabled;

  async function persist(nextRaw: string | null) {
    const validated = validateOfficialApplyUrl(nextRaw);
    if (!validated.ok) {
      setClientError(OFFICIAL_APPLY_URL_INVALID);
      return;
    }
    setClientError(null);
    setPersistError(null);
    setSaving(true);
    try {
      await onSaveOfficialApplyUrl!(job.id, validated.value ?? null);
      setDraft(validated.value ?? "");
    } catch {
      setPersistError(OFFICIAL_APPLY_URL_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="mt-3 grid gap-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] p-3"
      data-testid={`official-apply-url-field-${job.id}`}
    >
      <label htmlFor={inputId} className="text-sm font-medium text-[color:var(--af-text)]">
        {OFFICIAL_APPLY_URL_FIELD_LABEL}
      </label>
      <p id={hintId} className="text-xs text-[color:var(--af-text-muted)]">
        {OFFICIAL_APPLY_URL_FIELD_HINT}
      </p>
      <input
        id={inputId}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://…"
        value={draft}
        disabled={disabled || saving}
        aria-describedby={`${hintId}${clientError || persistError ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(clientError || persistError)}
        data-testid={`official-apply-url-input-${job.id}`}
        className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)] px-3 py-2 text-sm text-[color:var(--af-text)]"
        onChange={(event) => {
          setDraft(event.target.value);
          setClientError(null);
          setPersistError(null);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <ApplyFlowButton
          type="button"
          variant="secondary"
          size="sm"
          data-testid={`official-apply-url-save-${job.id}`}
          disabled={disabled || saving || unchanged}
          onClick={() => {
            void persist(draft);
          }}
        >
          {saving ? OFFICIAL_APPLY_URL_SAVING : OFFICIAL_APPLY_URL_SAVE_LABEL}
        </ApplyFlowButton>
        <ApplyFlowButton
          type="button"
          variant="ghost"
          size="sm"
          data-testid={`official-apply-url-remove-${job.id}`}
          disabled={!canRemove}
          onClick={() => {
            void persist(null);
          }}
        >
          {OFFICIAL_APPLY_URL_REMOVE_LABEL}
        </ApplyFlowButton>
      </div>
      {clientError || persistError ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-[color:var(--af-danger,var(--af-text))]"
          data-testid={`official-apply-url-error-${job.id}`}
        >
          {clientError ?? persistError}
        </p>
      ) : null}
    </div>
  );
}
