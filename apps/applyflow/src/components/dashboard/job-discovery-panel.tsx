"use client";

import Link from "next/link";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  JOB_DISCOVERY_ANY,
  JOB_DISCOVERY_ADD_DESCRIPTION,
  JOB_DISCOVERY_CANCEL,
  JOB_DISCOVERY_CONTRACT,
  JOB_DISCOVERY_CURRENCY,
  JOB_DISCOVERY_DESCRIPTION,
  JOB_DISCOVERY_DESCRIPTION_EMPTY,
  JOB_DISCOVERY_DESCRIPTION_HINT,
  JOB_DISCOVERY_DESCRIPTION_LABEL,
  JOB_DISCOVERY_DIRECT_APPLY,
  JOB_DISCOVERY_DUPLICATE,
  JOB_DISCOVERY_EMPTY,
  JOB_DISCOVERY_ERROR_MESSAGES,
  JOB_DISCOVERY_EXPERIENCE,
  JOB_DISCOVERY_KEYWORD,
  JOB_DISCOVERY_LOAD_MORE,
  JOB_DISCOVERY_LOADING,
  JOB_DISCOVERY_LOCATION,
  JOB_DISCOVERY_MISSING_DESCRIPTION,
  JOB_DISCOVERY_PREVIEW_ANALYZE,
  JOB_DISCOVERY_PREVIEW_ERROR,
  JOB_DISCOVERY_PREVIEW_MATCHED,
  JOB_DISCOVERY_PREVIEW_MISSING,
  JOB_DISCOVERY_PREVIEW_NEEDS_DESCRIPTION,
  JOB_DISCOVERY_PREVIEW_SCORE_SUFFIX,
  JOB_DISCOVERY_PREVIEW_SORT,
  JOB_DISCOVERY_PREVIEW_SORT_DEFAULT,
  JOB_DISCOVERY_PREVIEW_SORT_HINT,
  JOB_DISCOVERY_PREVIEW_SORT_MATCH,
  JOB_DISCOVERY_PREVIEW_UNKNOWN,
  JOB_DISCOVERY_PROVIDER,
  JOB_DISCOVERY_PROVIDER_JOBGETHER,
  JOB_DISCOVERY_PROVIDER_JOBGETHER_HINT,
  JOB_DISCOVERY_PROVIDER_REMOTEOK,
  JOB_DISCOVERY_PROVIDER_REMOTEOK_HINT,
  JOB_DISCOVERY_PROVIDER_THEIRSTACK,
  JOB_DISCOVERY_PROVIDER_THEIRSTACK_HINT,
  JOB_DISCOVERY_REMOTE,
  JOB_DISCOVERY_REMOTEOK_NOTE,
  JOB_DISCOVERY_REMOTEOK_UNSUPPORTED_FILTERS,
  JOB_DISCOVERY_SALARY_MAX,
  JOB_DISCOVERY_SALARY_MIN,
  JOB_DISCOVERY_SAVE,
  JOB_DISCOVERY_SAVE_ERROR,
  JOB_DISCOVERY_SAVED,
  JOB_DISCOVERY_SEARCH,
  JOB_DISCOVERY_SORT,
  JOB_DISCOVERY_SOURCE,
  JOB_DISCOVERY_SOURCE_REMOTEOK,
  JOB_DISCOVERY_SOURCE_THEIRSTACK,
  JOB_DISCOVERY_THEIRSTACK_NOTE,
  JOB_DISCOVERY_TITLE,
  JOB_DISCOVERY_VIEW_LISTING,
  JOB_DISCOVERY_VIEW_LISTING_GENERIC,
  JOB_DISCOVERY_VIEW_LISTING_REMOTEOK,
  JOB_INBOX_NEEDS_RESUME,
  JOB_MATCH_DECISION_LABELS,
  jobMatchDecisionTone,
} from "@/components/dashboard/job-inbox-content";
import {
  discoveryHitKey,
  evaluateDiscoveredJobHitPreview,
  matchProfileFingerprint,
  previewInputFingerprint,
  sortDiscoveryHitsByMatch,
  type DiscoveryHitPreviewState,
  type DiscoveryResultSort,
  type JobMatchPreview,
} from "@/lib/job-sources/preview-hit";
import { hasAnalyzableJobDescription, withHitDescription } from "@/lib/job-sources/save-hit";
import { requestJobSearch } from "@/lib/job-sources/search-client";
import { resolveInboxMatchProfile } from "@/lib/resolve-inbox-match-profile";
import {
  DEFAULT_JOB_SOURCE_ID,
  JOB_SEARCH_CONTRACT,
  JOB_SEARCH_EXPERIENCE,
  JOB_SEARCH_REMOTE,
  JOB_SEARCH_SORT,
  providerDefaultLimit,
  type DiscoveredJobSaveStatus,
  type JobSearchContract,
  type JobSearchExperience,
  type JobSearchHit,
  type JobSearchRemote,
  type JobSearchSort,
  type JobSourceId,
} from "@/lib/job-sources/types";
import { isOpenableJobUrl, type ResumeLibrary } from "@devflow/applyflow-core";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  "w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm text-[color:var(--af-text)]",
  "placeholder:text-[color:var(--af-text-muted)] focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
);

const EXPERIENCE_LABELS: Record<JobSearchExperience, string> = {
  entry: "Entrada",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  expert: "Especialista",
};

const REMOTE_LABELS: Record<JobSearchRemote, string> = {
  full_remote: "Remoto",
  remote_first: "Remote-first",
  hybrid: "Híbrido",
  include_hybrid: "Incluir híbrido",
};

const CONTRACT_LABELS: Record<JobSearchContract, string> = {
  full_time: "Tempo integral",
  part_time: "Meio período",
  fixed_term: "Prazo determinado",
  freelance: "Freelance",
  internship: "Estágio",
};

const SORT_LABELS: Record<JobSearchSort, string> = {
  relevance: "Relevância",
  date: "Mais recentes",
};

type Draft = {
  provider: JobSourceId;
  keyword: string;
  location: string;
  experience: "" | JobSearchExperience;
  remote: "" | JobSearchRemote;
  contract: "" | JobSearchContract;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  sort: "" | JobSearchSort;
};

const EMPTY_DRAFT: Draft = {
  provider: DEFAULT_JOB_SOURCE_ID,
  keyword: "",
  location: "",
  experience: "",
  remote: "",
  contract: "",
  salaryMin: "",
  salaryMax: "",
  currency: "",
  sort: "",
};

const MATCHED_CAP = 3;
const MISSING_CAP = 3;
const UNKNOWN_CAP = 2;

function optionalEnum<T extends string>(value: "" | T): T | undefined {
  return value ? value : undefined;
}

function optionalSalary(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

function sourceBadge(source: JobSourceId): string {
  if (source === "theirstack") return JOB_DISCOVERY_SOURCE_THEIRSTACK;
  if (source === "remoteok") return JOB_DISCOVERY_SOURCE_REMOTEOK;
  return JOB_DISCOVERY_SOURCE;
}

function listingLabel(source: JobSourceId): string {
  if (source === "remoteok") return JOB_DISCOVERY_VIEW_LISTING_REMOTEOK;
  if (source === "theirstack") return JOB_DISCOVERY_VIEW_LISTING_GENERIC;
  return JOB_DISCOVERY_VIEW_LISTING;
}

function resetProviderDraft(provider: JobSourceId): Partial<Draft> {
  if (provider !== "remoteok") return { provider };
  return {
    provider,
    contract: "",
    salaryMin: "",
    salaryMax: "",
    currency: "",
  };
}

export function buildDiscoveryCriteria(draft: Draft, page: number): Record<string, unknown> | "invalid_salary" {
  const remoteOk = draft.provider === "remoteok";
  const salaryMin = remoteOk ? undefined : optionalSalary(draft.salaryMin);
  const salaryMax = remoteOk ? undefined : optionalSalary(draft.salaryMax);
  if (Number.isNaN(salaryMin) || Number.isNaN(salaryMax)) return "invalid_salary";
  return {
    provider: draft.provider,
    page,
    limit: providerDefaultLimit(draft.provider),
    ...(draft.keyword.trim() ? { keyword: draft.keyword.trim() } : {}),
    ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
    ...(optionalEnum(draft.experience) ? { experience: draft.experience } : {}),
    ...(optionalEnum(draft.remote) ? { remote: draft.remote } : {}),
    ...(!remoteOk && optionalEnum(draft.contract) ? { contract: draft.contract } : {}),
    ...(!remoteOk && salaryMin != null ? { salaryMin } : {}),
    ...(!remoteOk && salaryMax != null ? { salaryMax } : {}),
    ...(!remoteOk && draft.currency.trim() ? { currency: draft.currency.trim() } : {}),
    ...(optionalEnum(draft.sort) ? { sort: draft.sort } : {}),
  };
}

function saveMessage(status: DiscoveredJobSaveStatus): string {
  if (status === "added") return JOB_DISCOVERY_SAVED;
  if (status === "duplicate") return JOB_DISCOVERY_DUPLICATE;
  if (status === "missing_description") return JOB_DISCOVERY_MISSING_DESCRIPTION;
  if (status === "needs_resume") return JOB_INBOX_NEEDS_RESUME;
  return JOB_DISCOVERY_SAVE_ERROR;
}

function skillLine(label: string, skills: readonly string[], cap: number) {
  if (skills.length === 0) return null;
  const visible = skills.slice(0, cap);
  const rest = skills.length - visible.length;
  return (
    <p className="text-xs text-[color:var(--af-text-muted)]">
      <span className="font-medium text-[color:var(--af-text)]">{label}:</span> {visible.join(" · ")}
      {rest > 0 ? ` · +${rest}` : ""}
    </p>
  );
}

export function DiscoveryMatchPreviewBlock({
  state,
}: {
  state?: DiscoveryHitPreviewState;
}) {
  if (!state || state.status === "idle") return null;
  if (state.status === "needs_description") {
    return (
      <p className="mt-3 text-xs text-[color:var(--af-text-muted)]" data-testid="discovery-preview-needs-description">
        {JOB_DISCOVERY_PREVIEW_NEEDS_DESCRIPTION}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p className="mt-3 text-xs text-red-200" role="alert" data-testid="discovery-preview-error">
        {JOB_DISCOVERY_PREVIEW_ERROR}
      </p>
    );
  }
  if (state.status === "evaluating") {
    return null;
  }
  const preview = state.preview;
  if (!preview) return null;
  return (
    <div
      className="mt-3 grid gap-1.5 border-t border-[color:var(--af-border)] pt-3"
      data-testid="discovery-match-preview"
      data-decision={preview.decision}
      data-score={preview.score}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ApplyFlowBadge tone={jobMatchDecisionTone(preview.decision)}>
          {JOB_MATCH_DECISION_LABELS[preview.decision]}
        </ApplyFlowBadge>
        <span className="tabular-nums text-sm font-medium text-[color:var(--af-text)]">
          {preview.score}
          {JOB_DISCOVERY_PREVIEW_SCORE_SUFFIX}
        </span>
      </div>
      {skillLine(JOB_DISCOVERY_PREVIEW_MATCHED, preview.matchedSkills, MATCHED_CAP)}
      {skillLine(JOB_DISCOVERY_PREVIEW_MISSING, preview.missingSkills, MISSING_CAP)}
      {skillLine(JOB_DISCOVERY_PREVIEW_UNKNOWN, preview.unknownSkills ?? [], UNKNOWN_CAP)}
    </div>
  );
}

export function JobDiscoveryHitCard({
  hit,
  matchAvailable,
  status,
  previewState,
  onSave,
  onApplyDescription,
}: {
  hit: JobSearchHit;
  matchAvailable: boolean;
  status?: DiscoveredJobSaveStatus;
  previewState?: DiscoveryHitPreviewState;
  onSave?: (hit: JobSearchHit) => void | Promise<void>;
  /** Attach pasted description for local preview — does not persist. */
  onApplyDescription?: (hit: JobSearchHit, description: string) => void;
}) {
  const descriptionFieldId = useId();
  const hasDescription = hasAnalyzableJobDescription(hit.description);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const badge = sourceBadge(hit.source);
  const hasDirectApply = Boolean(hit.directApplyUrl && isOpenableJobUrl(hit.directApplyUrl));
  const listingOpenable = isOpenableJobUrl(hit.sourceUrl);
  const showRemoteOkAttribution = hit.source === "remoteok" && listingOpenable;

  function closeEditor() {
    setEditorOpen(false);
    setDraftDescription("");
    setLocalError(null);
  }

  function submitDescriptionForPreview() {
    const completed = withHitDescription(hit, draftDescription);
    if (!completed) {
      setLocalError(JOB_DISCOVERY_DESCRIPTION_EMPTY);
      return;
    }
    onApplyDescription?.(completed, completed.description ?? "");
    closeEditor();
  }

  return (
    <ApplyFlowCard variant="muted" padding="md">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-[color:var(--af-text)]">{hit.title}</h4>
        {showRemoteOkAttribution ? (
          <a
            href={hit.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--af-text)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]"
            data-testid="remoteok-attribution"
          >
            {JOB_DISCOVERY_SOURCE_REMOTEOK}
          </a>
        ) : (
          <ApplyFlowBadge tone="intel">{badge}</ApplyFlowBadge>
        )}
      </div>
      {hit.company ? <p className="mt-1 text-sm text-[color:var(--af-text)]">{hit.company}</p> : null}
      <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
        {[hit.location, hit.remote, hit.experience, hit.contractType, hit.salaryRange, hit.postedAt?.slice(0, 10)]
          .filter(Boolean)
          .join(" · ") || "—"}
      </p>
      {hit.technologies && hit.technologies.length > 0 ? (
        <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{hit.technologies.slice(0, 6).join(" · ")}</p>
      ) : null}
      <DiscoveryMatchPreviewBlock state={previewState} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {listingOpenable ? (
          <a
            href={hit.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={applyFlowButtonClass({ variant: "secondary", size: "sm" })}
            data-testid={hit.source === "remoteok" ? "remoteok-listing-link" : undefined}
          >
            {listingLabel(hit.source)}
          </a>
        ) : null}
        {hasDirectApply ? (
          <a
            href={hit.directApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={applyFlowButtonClass({ variant: "secondary", size: "sm" })}
          >
            {JOB_DISCOVERY_DIRECT_APPLY}
          </a>
        ) : null}
        {hasDescription ? (
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="sm"
            disabled={!matchAvailable || saving}
            data-testid="discovery-save"
            onClick={() => {
              if (!onSave) return;
              setSaving(true);
              void Promise.resolve(onSave(hit)).finally(() => setSaving(false));
            }}
          >
            {JOB_DISCOVERY_SAVE}
          </ApplyFlowButton>
        ) : (
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="sm"
            disabled={!matchAvailable}
            onClick={() => {
              setEditorOpen(true);
              setLocalError(null);
            }}
          >
            {JOB_DISCOVERY_ADD_DESCRIPTION}
          </ApplyFlowButton>
        )}
      </div>
      {!matchAvailable ? (
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{JOB_INBOX_NEEDS_RESUME}</p>
      ) : null}
      {matchAvailable && !hasDescription && !editorOpen ? (
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_MISSING_DESCRIPTION}</p>
      ) : null}
      {editorOpen ? (
        <form
          className="mt-4 grid gap-3 border-t border-[color:var(--af-border)] pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitDescriptionForPreview();
          }}
        >
          <p className="text-xs text-[color:var(--af-text-muted)]">
            {hit.title}
            {hit.company ? ` · ${hit.company}` : ""} · {badge}
          </p>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]" htmlFor={descriptionFieldId}>
            {JOB_DISCOVERY_DESCRIPTION_LABEL}
            <textarea
              id={descriptionFieldId}
              required
              rows={8}
              value={draftDescription}
              onChange={(event) => {
                setDraftDescription(event.target.value);
                if (localError) setLocalError(null);
              }}
              className={fieldClass}
              placeholder={JOB_DISCOVERY_DESCRIPTION_HINT}
            />
          </label>
          <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_DESCRIPTION_HINT}</p>
          {localError ? (
            <p className="text-xs text-red-200" role="alert">
              {localError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <ApplyFlowButton type="submit" variant="primary" size="sm" disabled={!matchAvailable}>
              {JOB_DISCOVERY_PREVIEW_ANALYZE}
            </ApplyFlowButton>
            <ApplyFlowButton type="button" variant="secondary" size="sm" onClick={closeEditor}>
              {JOB_DISCOVERY_CANCEL}
            </ApplyFlowButton>
          </div>
        </form>
      ) : null}
      {status ? (
        <p className="mt-2 text-xs text-[color:var(--af-text)]" role="status">
          {saveMessage(status)}
        </p>
      ) : null}
    </ApplyFlowCard>
  );
}

function computePreviewMap(
  hits: readonly JobSearchHit[],
  resumeLibrary: ResumeLibrary | null | undefined,
  previous: Record<string, DiscoveryHitPreviewState>,
): Record<string, DiscoveryHitPreviewState> {
  const profile = resolveInboxMatchProfile(resumeLibrary);
  const profileFp = matchProfileFingerprint(resumeLibrary);
  const next: Record<string, DiscoveryHitPreviewState> = {};

  for (const hit of hits) {
    const key = discoveryHitKey(hit);
    if (!profile || !profileFp) {
      next[key] = { status: "idle" };
      continue;
    }
    if (!hasAnalyzableJobDescription(hit.description)) {
      next[key] = { status: "needs_description" };
      continue;
    }
    const fingerprint = previewInputFingerprint(hit, profileFp);
    const existing = previous[key];
    if (
      existing &&
      existing.status === "ready" &&
      existing.fingerprint === fingerprint &&
      existing.preview
    ) {
      next[key] = existing;
      continue;
    }
    const evaluated = evaluateDiscoveredJobHitPreview(hit, {
      profile,
      resumeLibrary: resumeLibrary ?? undefined,
    });
    if (!evaluated.ok) {
      next[key] = {
        status: evaluated.reason === "missing_description" ? "needs_description" : "error",
        fingerprint: fingerprint ?? undefined,
      };
      continue;
    }
    next[key] = {
      status: "ready",
      preview: evaluated.preview,
      fingerprint: fingerprint ?? undefined,
    };
  }
  return next;
}

export function JobDiscoveryPanel({
  matchAvailable,
  onSave,
  onSearch = requestJobSearch,
  resumeLibrary = null,
}: {
  matchAvailable: boolean;
  onSave?: (hit: JobSearchHit) => Promise<DiscoveredJobSaveStatus>;
  onSearch?: typeof requestJobSearch;
  resumeLibrary?: ResumeLibrary | null;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hits, setHits] = useState<JobSearchHit[]>([]);
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, DiscoveredJobSaveStatus>>({});
  const [resultSort, setResultSort] = useState<DiscoveryResultSort>("default");

  const effectiveHits = useMemo(
    () =>
      hits.map((hit) => {
        const override = descriptionOverrides[discoveryHitKey(hit)];
        return override ? { ...hit, description: override } : hit;
      }),
    [hits, descriptionOverrides],
  );

  const previews = useMemo(
    () => computePreviewMap(effectiveHits, resumeLibrary, {}),
    [effectiveHits, resumeLibrary],
  );

  const displayedHits = useMemo(() => {
    if (resultSort !== "match") return effectiveHits;
    return sortDiscoveryHitsByMatch(effectiveHits, previews);
  }, [effectiveHits, previews, resultSort]);

  function clearDiscoveryState() {
    setHits([]);
    setDescriptionOverrides({});
    setHasMore(false);
    setSearched(false);
    setError(null);
    setErrorCode(null);
    setStatuses({});
  }

  async function runSearch(nextPage: number, append: boolean) {
    const criteria = buildDiscoveryCriteria(draft, nextPage);
    if (criteria === "invalid_salary") {
      setError(JOB_DISCOVERY_ERROR_MESSAGES.invalid_criteria ?? null);
      setErrorCode("invalid_criteria");
      return;
    }
    setLoading(true);
    setError(null);
    setErrorCode(null);
    const result = await onSearch(criteria);
    setLoading(false);
    if (!result.ok) {
      setError(JOB_DISCOVERY_ERROR_MESSAGES[result.error] ?? JOB_DISCOVERY_ERROR_MESSAGES.provider_unavailable ?? null);
      setErrorCode(result.error);
      return;
    }
    setSearched(true);
    setPage(result.page.page);
    setHasMore(result.page.hasMore);
    setHits((current) => {
      if (!append) {
        setDescriptionOverrides({});
        return result.page.hits;
      }
      const seen = new Set(current.map((item) => discoveryHitKey(item)));
      return [
        ...current,
        ...result.page.hits.filter((item) => !seen.has(discoveryHitKey(item))),
      ];
    });
  }

  return (
    <ApplyFlowCard padding="md" className="mb-6">
      <h3 className="text-base font-semibold text-[color:var(--af-text)]">{JOB_DISCOVERY_TITLE}</h3>
      <p className="mt-1 text-sm text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_DESCRIPTION}</p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setStatuses({});
          void runSearch(1, false);
        }}
      >
        <fieldset className="grid gap-2">
          <legend className="text-sm text-[color:var(--af-text)]">{JOB_DISCOVERY_PROVIDER}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex cursor-pointer items-start gap-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="job-source-provider"
                className="mt-1"
                data-testid="discovery-provider-jobgether"
                checked={draft.provider === "jobgether"}
                onChange={() => {
                  setDraft((current) => ({ ...current, ...resetProviderDraft("jobgether") }));
                  clearDiscoveryState();
                }}
              />
              <span>
                <span className="block font-medium text-[color:var(--af-text)]">{JOB_DISCOVERY_PROVIDER_JOBGETHER}</span>
                <span className="block text-xs text-[color:var(--af-text-muted)]">
                  {JOB_DISCOVERY_PROVIDER_JOBGETHER_HINT}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="job-source-provider"
                className="mt-1"
                data-testid="discovery-provider-theirstack"
                checked={draft.provider === "theirstack"}
                onChange={() => {
                  setDraft((current) => ({ ...current, ...resetProviderDraft("theirstack") }));
                  clearDiscoveryState();
                }}
              />
              <span>
                <span className="block font-medium text-[color:var(--af-text)]">{JOB_DISCOVERY_PROVIDER_THEIRSTACK}</span>
                <span className="block text-xs text-[color:var(--af-text-muted)]">
                  {JOB_DISCOVERY_PROVIDER_THEIRSTACK_HINT}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="job-source-provider"
                className="mt-1"
                data-testid="discovery-provider-remoteok"
                checked={draft.provider === "remoteok"}
                onChange={() => {
                  setDraft((current) => ({ ...current, ...resetProviderDraft("remoteok") }));
                  clearDiscoveryState();
                }}
              />
              <span>
                <span className="block font-medium text-[color:var(--af-text)]">{JOB_DISCOVERY_PROVIDER_REMOTEOK}</span>
                <span className="block text-xs text-[color:var(--af-text-muted)]">
                  {JOB_DISCOVERY_PROVIDER_REMOTEOK_HINT}
                </span>
              </span>
            </label>
          </div>
          {draft.provider === "theirstack" ? (
            <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_THEIRSTACK_NOTE}</p>
          ) : null}
          {draft.provider === "remoteok" ? (
            <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_REMOTEOK_NOTE}</p>
          ) : null}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_KEYWORD}
            <input
              value={draft.keyword}
              onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
              className={fieldClass}
              autoComplete="off"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_LOCATION}
            <input
              value={draft.location}
              onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
              className={fieldClass}
              placeholder="Brazil"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_EXPERIENCE}
            <select
              value={draft.experience}
              onChange={(event) =>
                setDraft((current) => ({ ...current, experience: event.target.value as Draft["experience"] }))
              }
              className={fieldClass}
            >
              <option value="">{JOB_DISCOVERY_ANY}</option>
              {JOB_SEARCH_EXPERIENCE.map((value) => (
                <option key={value} value={value}>
                  {EXPERIENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_REMOTE}
            <select
              value={draft.remote}
              onChange={(event) => setDraft((current) => ({ ...current, remote: event.target.value as Draft["remote"] }))}
              className={fieldClass}
            >
              <option value="">{JOB_DISCOVERY_ANY}</option>
              {JOB_SEARCH_REMOTE.map((value) => (
                <option key={value} value={value}>
                  {REMOTE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_CONTRACT}
            <select
              value={draft.contract}
              disabled={draft.provider === "remoteok"}
              onChange={(event) =>
                setDraft((current) => ({ ...current, contract: event.target.value as Draft["contract"] }))
              }
              className={fieldClass}
            >
              <option value="">{JOB_DISCOVERY_ANY}</option>
              {JOB_SEARCH_CONTRACT.map((value) => (
                <option key={value} value={value}>
                  {CONTRACT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {draft.provider === "remoteok" ? (
          <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_REMOTEOK_UNSUPPORTED_FILTERS}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_SALARY_MIN}
            <input
              value={draft.salaryMin}
              disabled={draft.provider === "remoteok"}
              onChange={(event) => setDraft((current) => ({ ...current, salaryMin: event.target.value }))}
              className={fieldClass}
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_SALARY_MAX}
            <input
              value={draft.salaryMax}
              disabled={draft.provider === "remoteok"}
              onChange={(event) => setDraft((current) => ({ ...current, salaryMax: event.target.value }))}
              className={fieldClass}
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_CURRENCY}
            <input
              value={draft.currency}
              disabled={draft.provider === "remoteok"}
              onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}
              className={fieldClass}
              maxLength={3}
              placeholder="USD"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_SORT}
            <select
              value={draft.sort}
              onChange={(event) => setDraft((current) => ({ ...current, sort: event.target.value as Draft["sort"] }))}
              className={fieldClass}
            >
              <option value="">{JOB_DISCOVERY_ANY}</option>
              {JOB_SEARCH_SORT.map((value) => (
                <option key={value} value={value}>
                  {SORT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <ApplyFlowButton type="submit" variant="primary" size="md" disabled={loading} data-testid="discovery-search">
            {loading ? JOB_DISCOVERY_LOADING : JOB_DISCOVERY_SEARCH}
          </ApplyFlowButton>
        </div>
      </form>
      {error ? (
        <p className="mt-3 text-sm text-red-200" role="alert" data-testid="discovery-error">
          {error}
          {errorCode === "auth_required" ? (
            <>
              {" "}
              <Link href="/login" className="underline underline-offset-2">
                Entrar
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {displayedHits.length > 0 ? (
        <div className="mt-4 grid gap-2">
          <label className="grid max-w-xs gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_PREVIEW_SORT}
            <select
              value={resultSort}
              onChange={(event) => setResultSort(event.target.value as DiscoveryResultSort)}
              className={fieldClass}
              data-testid="discovery-result-sort"
            >
              <option value="default">{JOB_DISCOVERY_PREVIEW_SORT_DEFAULT}</option>
              <option value="match">{JOB_DISCOVERY_PREVIEW_SORT_MATCH}</option>
            </select>
          </label>
          <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_PREVIEW_SORT_HINT}</p>
        </div>
      ) : null}
      {displayedHits.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {displayedHits.map((item) => (
            <li key={discoveryHitKey(item)}>
              <JobDiscoveryHitCard
                hit={item}
                matchAvailable={matchAvailable}
                status={statuses[discoveryHitKey(item)]}
                previewState={previews[discoveryHitKey(item)]}
                onApplyDescription={(selected, description) => {
                  setDescriptionOverrides((current) => ({
                    ...current,
                    [discoveryHitKey(selected)]: description,
                  }));
                }}
                onSave={async (selected) => {
                  if (!onSave) return;
                  const nextStatus = await onSave(selected);
                  setStatuses((current) => ({
                    ...current,
                    [discoveryHitKey(selected)]: nextStatus,
                  }));
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <DiscoveryEmpty visible={searched && !loading && !error && displayedHits.length === 0} />
      {hasMore ? (
        <div className="mt-4">
          <ApplyFlowButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void runSearch(page + 1, true)}
          >
            {JOB_DISCOVERY_LOAD_MORE}
          </ApplyFlowButton>
        </div>
      ) : null}
    </ApplyFlowCard>
  );
}

function DiscoveryEmpty({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <p className="mt-4 text-sm text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_EMPTY}</p>;
}

export type { JobMatchPreview };
