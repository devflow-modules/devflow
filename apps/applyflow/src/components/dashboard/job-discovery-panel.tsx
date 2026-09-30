"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  JOB_DISCOVERY_ANY,
  JOB_DISCOVERY_ADD_DESCRIPTION,
  JOB_DISCOVERY_ANALYZE,
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
  JOB_DISCOVERY_PROVIDER,
  JOB_DISCOVERY_PROVIDER_JOBGETHER,
  JOB_DISCOVERY_PROVIDER_JOBGETHER_HINT,
  JOB_DISCOVERY_PROVIDER_THEIRSTACK,
  JOB_DISCOVERY_PROVIDER_THEIRSTACK_HINT,
  JOB_DISCOVERY_REMOTE,
  JOB_DISCOVERY_SALARY_MAX,
  JOB_DISCOVERY_SALARY_MIN,
  JOB_DISCOVERY_SAVE,
  JOB_DISCOVERY_SAVE_ERROR,
  JOB_DISCOVERY_SAVED,
  JOB_DISCOVERY_SEARCH,
  JOB_DISCOVERY_SORT,
  JOB_DISCOVERY_SOURCE,
  JOB_DISCOVERY_SOURCE_THEIRSTACK,
  JOB_DISCOVERY_THEIRSTACK_NOTE,
  JOB_DISCOVERY_TITLE,
  JOB_DISCOVERY_VIEW_LISTING,
  JOB_DISCOVERY_VIEW_LISTING_GENERIC,
  JOB_INBOX_NEEDS_RESUME,
} from "@/components/dashboard/job-inbox-content";
import { hasAnalyzableJobDescription, withHitDescription } from "@/lib/job-sources/save-hit";
import { requestJobSearch } from "@/lib/job-sources/search-client";
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
import { isOpenableJobUrl } from "@devflow/applyflow-core";
import { useId, useState } from "react";
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
  return source === "theirstack" ? JOB_DISCOVERY_SOURCE_THEIRSTACK : JOB_DISCOVERY_SOURCE;
}

function listingLabel(source: JobSourceId): string {
  return source === "theirstack" ? JOB_DISCOVERY_VIEW_LISTING_GENERIC : JOB_DISCOVERY_VIEW_LISTING;
}

export function buildDiscoveryCriteria(draft: Draft, page: number): Record<string, unknown> | "invalid_salary" {
  const salaryMin = optionalSalary(draft.salaryMin);
  const salaryMax = optionalSalary(draft.salaryMax);
  if (Number.isNaN(salaryMin) || Number.isNaN(salaryMax)) return "invalid_salary";
  return {
    provider: draft.provider,
    page,
    limit: providerDefaultLimit(draft.provider),
    ...(draft.keyword.trim() ? { keyword: draft.keyword.trim() } : {}),
    ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
    ...(optionalEnum(draft.experience) ? { experience: draft.experience } : {}),
    ...(optionalEnum(draft.remote) ? { remote: draft.remote } : {}),
    ...(optionalEnum(draft.contract) ? { contract: draft.contract } : {}),
    ...(salaryMin != null ? { salaryMin } : {}),
    ...(salaryMax != null ? { salaryMax } : {}),
    ...(draft.currency.trim() ? { currency: draft.currency.trim() } : {}),
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

export function JobDiscoveryHitCard({
  hit,
  matchAvailable,
  status,
  onSave,
}: {
  hit: JobSearchHit;
  matchAvailable: boolean;
  status?: DiscoveredJobSaveStatus;
  onSave?: (hit: JobSearchHit) => void | Promise<void>;
}) {
  const descriptionFieldId = useId();
  const hasDescription = hasAnalyzableJobDescription(hit.description);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const badge = sourceBadge(hit.source);
  const hasDirectApply = Boolean(hit.directApplyUrl && isOpenableJobUrl(hit.directApplyUrl));

  function closeEditor() {
    setEditorOpen(false);
    setDraftDescription("");
    setLocalError(null);
  }

  async function submitWithDescription() {
    const completed = withHitDescription(hit, draftDescription);
    if (!completed) {
      setLocalError(JOB_DISCOVERY_DESCRIPTION_EMPTY);
      return;
    }
    if (!onSave) return;
    setSaving(true);
    setLocalError(null);
    try {
      await onSave(completed);
      closeEditor();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ApplyFlowCard variant="muted" padding="md">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-[color:var(--af-text)]">{hit.title}</h4>
        <ApplyFlowBadge tone="intel">{badge}</ApplyFlowBadge>
      </div>
      {hit.company ? <p className="mt-1 text-sm text-[color:var(--af-text)]">{hit.company}</p> : null}
      <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
        {[hit.location, hit.remote, hit.experience, hit.contractType, hit.salaryRange].filter(Boolean).join(" · ") || "—"}
      </p>
      {hit.technologies && hit.technologies.length > 0 ? (
        <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{hit.technologies.slice(0, 8).join(" · ")}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isOpenableJobUrl(hit.sourceUrl) ? (
          <a
            href={hit.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={applyFlowButtonClass({ variant: "secondary", size: "sm" })}
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
            onClick={() => {
              if (!onSave) return;
              void Promise.resolve(onSave(hit));
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
            void submitWithDescription();
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
            <ApplyFlowButton type="submit" variant="primary" size="sm" disabled={saving || !matchAvailable}>
              {JOB_DISCOVERY_ANALYZE}
            </ApplyFlowButton>
            <ApplyFlowButton type="button" variant="secondary" size="sm" disabled={saving} onClick={closeEditor}>
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

export function JobDiscoveryPanel({
  matchAvailable,
  onSave,
  onSearch = requestJobSearch,
}: {
  matchAvailable: boolean;
  onSave?: (hit: JobSearchHit) => Promise<DiscoveredJobSaveStatus>;
  onSearch?: typeof requestJobSearch;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hits, setHits] = useState<JobSearchHit[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, DiscoveredJobSaveStatus>>({});

  async function runSearch(nextPage: number, append: boolean) {
    const criteria = buildDiscoveryCriteria(draft, nextPage);
    if (criteria === "invalid_salary") {
      setError(JOB_DISCOVERY_ERROR_MESSAGES.invalid_criteria ?? null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await onSearch(criteria);
    setLoading(false);
    if (!result.ok) {
      setError(JOB_DISCOVERY_ERROR_MESSAGES[result.error] ?? JOB_DISCOVERY_ERROR_MESSAGES.provider_unavailable ?? null);
      return;
    }
    setSearched(true);
    setPage(result.page.page);
    setHasMore(result.page.hasMore);
    setHits((current) => {
      if (!append) return result.page.hits;
      const seen = new Set(current.map((item) => `${item.source}:${item.externalId}`));
      return [
        ...current,
        ...result.page.hits.filter((item) => !seen.has(`${item.source}:${item.externalId}`)),
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
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="job-source-provider"
                className="mt-1"
                checked={draft.provider === "jobgether"}
                onChange={() => {
                  setDraft((current) => ({ ...current, provider: "jobgether" }));
                  setHits([]);
                  setHasMore(false);
                  setSearched(false);
                  setError(null);
                  setStatuses({});
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
                checked={draft.provider === "theirstack"}
                onChange={() => {
                  setDraft((current) => ({ ...current, provider: "theirstack" }));
                  setHits([]);
                  setHasMore(false);
                  setSearched(false);
                  setError(null);
                  setStatuses({});
                }}
              />
              <span>
                <span className="block font-medium text-[color:var(--af-text)]">{JOB_DISCOVERY_PROVIDER_THEIRSTACK}</span>
                <span className="block text-xs text-[color:var(--af-text-muted)]">
                  {JOB_DISCOVERY_PROVIDER_THEIRSTACK_HINT}
                </span>
              </span>
            </label>
          </div>
          {draft.provider === "theirstack" ? (
            <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DISCOVERY_THEIRSTACK_NOTE}</p>
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
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_SALARY_MIN}
            <input
              value={draft.salaryMin}
              onChange={(event) => setDraft((current) => ({ ...current, salaryMin: event.target.value }))}
              className={fieldClass}
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_SALARY_MAX}
            <input
              value={draft.salaryMax}
              onChange={(event) => setDraft((current) => ({ ...current, salaryMax: event.target.value }))}
              className={fieldClass}
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_DISCOVERY_CURRENCY}
            <input
              value={draft.currency}
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
          <ApplyFlowButton type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? JOB_DISCOVERY_LOADING : JOB_DISCOVERY_SEARCH}
          </ApplyFlowButton>
        </div>
      </form>
      {error ? (
        <p className="mt-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {hits.map((item) => (
            <li key={`${item.source}:${item.externalId}`}>
              <JobDiscoveryHitCard
                hit={item}
                matchAvailable={matchAvailable}
                status={statuses[`${item.source}:${item.externalId}`]}
                onSave={async (selected) => {
                  if (!onSave) return;
                  const nextStatus = await onSave(selected);
                  setStatuses((current) => ({
                    ...current,
                    [`${selected.source}:${selected.externalId}`]: nextStatus,
                  }));
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <DiscoveryEmpty visible={searched && !loading && !error && hits.length === 0} />
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
