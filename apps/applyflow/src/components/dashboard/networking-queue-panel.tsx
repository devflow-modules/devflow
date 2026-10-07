"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Contact } from "@devflow/applyflow-core";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { applyFlowControlClass } from "@/components/ui/apply-flow-control-classes";
import { networkingStatusTone } from "@/components/ui/status-tones";
import { applyOpportunityPipelineJson } from "@/lib/import-opportunity-pipeline-local";
import { loadDashboardContacts } from "@/lib/local-contact-storage";
import { personalLocalWritesAllowed } from "@/lib/persistence-v2/personal/client-scope";
import {
  NETWORKING_QUEUE_FILTERS,
  NETWORKING_STRATEGY_LABELS,
  networkingIndicatorLabel,
  selectNetworkingQueue,
  type ApplyFlowJob,
  type NetworkingQueueFilter,
} from "@devflow/applyflow-core";

const FILTER_LABELS: Record<NetworkingQueueFilter, string> = {
  all: "All",
  ready: "Ready",
  sent: "Sent",
  replied: "Replied",
  follow_up: "Follow-up",
  no_contact: "No contact",
};

export function NetworkingQueuePanel({
  jobs,
  onImported,
}: {
  jobs: ApplyFlowJob[];
  onImported?: () => void;
}) {
  const [filter, setFilter] = useState<NetworkingQueueFilter>("all");
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(() => loadDashboardContacts().contacts);
  /** Align with active opportunity queue — applied/ignored stay on job detail Networking tab. */
  const networkingJobs = useMemo(
    () => jobs.filter((job) => job.status === "reviewing"),
    [jobs],
  );

  const items = useMemo(
    () => selectNetworkingQueue(networkingJobs, contacts, { filter }),
    [networkingJobs, contacts, filter],
  );

  return (
    <ApplyFlowSection
      id="networking-queue"
      title="Networking queue"
      description="Human-in-the-loop outreach por oportunidade. Nenhuma mensagem é enviada automaticamente."
    >
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-[color:var(--af-text-muted)]">
          Filtro
          <select
            className={applyFlowControlClass}
            value={filter}
            onChange={(event) => setFilter(event.target.value as NetworkingQueueFilter)}
          >
            {NETWORKING_QUEUE_FILTERS.map((value) => (
              <option key={value} value={value}>
                {FILTER_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[color:var(--af-text-muted)]">
          Import private pipeline ({personalLocalWritesAllowed() ? "local JSON" : "account"})
          <input
            type="file"
            accept="application/json,.json"
            className="text-xs"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setImportError(null);
              setImportOk(null);
              try {
                const text = await file.text();
                const result = await applyOpportunityPipelineJson(text);
                if (!result.ok) {
                  const partial = result.partial;
                  setImportError(
                    partial && (partial.jobsAdded > 0 || partial.jobsSkipped > 0)
                      ? `${result.error} (jobs partial: added ${partial.jobsAdded}, skipped ${partial.jobsSkipped}; contacts not completed — not a full success; retry skips existing jobs)`
                      : result.error,
                  );
                  if (partial && (partial.jobsAdded > 0 || partial.jobsSkipped > 0)) {
                    setContacts(loadDashboardContacts().contacts);
                    onImported?.();
                  }
                  return;
                }
                setImportOk(
                  `Imported ${result.jobs.length} jobs · ${result.contacts.length} contacts` +
                    (result.ignoredCount ? ` · ${result.ignoredCount} ignored` : "") +
                    ` · ${result.storage}`,
                );
                setContacts(loadDashboardContacts().contacts);
                onImported?.();
              } catch {
                setImportError("invalid_json");
              }
            }}
          />
        </label>
      </div>
      {importError ? (
        <p role="alert" className="mb-3 text-sm text-red-200">
          Import failed: {importError}
        </p>
      ) : null}
      {importOk ? <p className="mb-3 text-sm text-emerald-200">{importOk}</p> : null}

      {items.length === 0 ? (
        <ApplyFlowCard padding="md">
          <p className="text-sm text-[color:var(--af-text-muted)]">
            Nenhuma oportunidade neste filtro de networking.
          </p>
        </ApplyFlowCard>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.jobId}>
              <ApplyFlowCard padding="md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[color:var(--af-text)]">
                      {item.company ?? "—"} · {item.title}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
                      {item.contactName ?? "No contact"}
                      {item.strategy ? ` · ${NETWORKING_STRATEGY_LABELS[item.strategy]}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm tabular-nums text-[color:var(--af-text)]">
                      {item.matchScore}%
                    </span>
                    {item.manualMatchOverride ? (
                      <ApplyFlowBadge tone="neutral">Manual score</ApplyFlowBadge>
                    ) : null}
                    <ApplyFlowBadge
                      tone={
                        item.outreachStatus
                          ? networkingStatusTone(item.outreachStatus)
                          : "neutral"
                      }
                    >
                      {networkingIndicatorLabel(item)}
                    </ApplyFlowBadge>
                  </div>
                </div>
                <div className="mt-3">
                  <Link href={`/dashboard/jobs/${item.jobId}`}>
                    <ApplyFlowButton type="button" variant="ghost" size="sm">
                      Open job
                    </ApplyFlowButton>
                  </Link>
                </div>
              </ApplyFlowCard>
            </li>
          ))}
        </ul>
      )}
    </ApplyFlowSection>
  );
}
