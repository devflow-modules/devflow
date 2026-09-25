"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { loadCareerAnalyticsSnapshot } from "@/lib/career-analytics-snapshot";
import { useClientHydrated } from "@/lib/use-client-hydrated";
import { DashboardPersistenceNotice } from "@/components/dashboard/dashboard-persistence-notice";
import { openDashboardPersistence } from "@/lib/persistence-v2/dashboard/open-dashboard-persistence";
import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import {
  CAREER_ANALYTICS_DISCLAIMER,
  CAREER_ANALYTICS_EMPTY,
  CAREER_ANALYTICS_EYEBROW,
  CAREER_ANALYTICS_HINT,
  CAREER_ANALYTICS_HISTORY_HINT,
  CAREER_ANALYTICS_TABS,
  CAREER_ANALYTICS_TITLE,
} from "./career-analytics-content";
import { DashboardHistoryCharts } from "./dashboard-history-charts";

type AnalyticsTab = keyof typeof CAREER_ANALYTICS_TABS;

const CHART_TOOLTIP = { background: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7" };

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function CareerAnalyticsPanel({ persistenceV2Enabled = false }: { persistenceV2Enabled?: boolean }) {
  const hydrated = useClientHydrated();
  const [remoteGate, setRemoteGate] = useState<"migration_required" | "auth_required" | "error" | null>(null);
  const [remoteDomain, setRemoteDomain] = useState<{
    jobs: ApplyFlowJob[];
    applications: ApplyFlowApplicationV2Envelope[];
  } | null>(null);
  useEffect(() => {
    if (!hydrated || !persistenceV2Enabled) return;
    let cancelled = false;
    void openDashboardPersistence({ persistenceV2Enabled: true }).then((opened) => {
      if (cancelled) return;
      if (opened.kind === "ready") {
        setRemoteDomain({ jobs: opened.jobs, applications: opened.applications });
        setRemoteGate(null);
        return;
      }
      if (opened.kind === "migration_required" || opened.kind === "auth_required" || opened.kind === "error") {
        setRemoteGate(opened.kind);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, persistenceV2Enabled]);
  const snapshot = useMemo(() => {
    if (!hydrated) return null;
    if (!persistenceV2Enabled) return loadCareerAnalyticsSnapshot();
    if (!remoteDomain) return null;
    return loadCareerAnalyticsSnapshot({
      jobs: remoteDomain.jobs,
      applications: remoteDomain.applications,
    });
  }, [hydrated, persistenceV2Enabled, remoteDomain]);
  const [tab, setTab] = useState<AnalyticsTab>("overview");

  const empty = Boolean(
    snapshot && (snapshot.scorecard?.applications ?? 0) === 0 && (snapshot.scorecard?.jobsFound ?? 0) === 0,
  );

  if (persistenceV2Enabled && remoteGate) {
    return <DashboardPersistenceNotice kind={remoteGate} />;
  }

  if (!snapshot) {
    return <p className="text-sm text-[color:var(--af-text-muted)]">A carregar…</p>;
  }

  const {
    historyApplications,
    scorecard,
    insights,
    funnelBars,
    roles,
    sources,
    resumes,
    networking,
    outreach,
    gaps,
    gapMap,
    weekly,
    disclaimer,
  } = snapshot;

  return (
    <ApplyFlowSection eyebrow={CAREER_ANALYTICS_EYEBROW} title={CAREER_ANALYTICS_TITLE} description={CAREER_ANALYTICS_HINT}>
      <Link href="/dashboard" className="text-xs text-emerald-300 hover:text-emerald-200">
        Voltar ao dashboard
      </Link>
      <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_DISCLAIMER}</p>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Career analytics">
        {(Object.keys(CAREER_ANALYTICS_TABS) as AnalyticsTab[]).map((key) => (
          <ApplyFlowButton
            key={key}
            type="button"
            role="tab"
            variant={tab === key ? "outlineBrand" : "ghost"}
            size="sm"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === key
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                : "border-[color:var(--af-border)] text-[color:var(--af-text-muted)]"
            }`}
          >
            {CAREER_ANALYTICS_TABS[key]}
          </ApplyFlowButton>
        ))}
      </div>

      {empty ? (
        <ApplyFlowCard variant="muted" padding="md" className="mt-4">
          <p className="text-sm">{CAREER_ANALYTICS_EMPTY}</p>
        </ApplyFlowCard>
      ) : null}

      {tab === "overview" && scorecard ? (
        <div className="mt-4 grid gap-4">
          <ApplyFlowCard padding="md">
            <div className="grid gap-2 sm:grid-cols-4">
              <p>Aplicadas: {scorecard.applications}</p>
              <p>Respostas: {scorecard.replies}</p>
              <p>Screenings: {scorecard.screenings}</p>
              <p>Offers: {scorecard.offers}</p>
            </div>
            <p className="mt-3 text-sm text-[color:var(--af-text-muted)]">
              Response {pct(scorecard.responseRate)} · Screening {pct(scorecard.screeningRate)} · Offer {pct(scorecard.offerRate)}
            </p>
            {weekly ? (
              <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
                7d: {weekly.applications} candidaturas, {weekly.screenings} screenings
                {weekly.previous != null ? ` · período anterior: ${weekly.previous}` : ""}
              </p>
            ) : null}
          </ApplyFlowCard>
          <ApplyFlowCard padding="md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">Top insights</p>
            <ul className="mt-2 grid gap-2 text-sm">
              {insights.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <ApplyFlowBadge tone={item.confidence === "low" ? "warning" : "intel"}>{item.confidence}</ApplyFlowBadge> {item.title}
                </li>
              ))}
            </ul>
          </ApplyFlowCard>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="mt-4">
          <p className="text-xs text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_HISTORY_HINT}</p>
          <DashboardHistoryCharts applications={historyApplications} />
        </div>
      ) : null}

      {tab === "funnel" ? (
        <ApplyFlowCard padding="md" className="mt-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.6)" />
                <XAxis type="number" stroke="#71717a" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ApplyFlowCard>
      ) : null}

      {tab === "roles" ? (
        <ApplyFlowCard padding="md" className="mt-4">
          <ul className="grid gap-2 text-sm">
            {roles.map((item) => (
              <li key={item.name}>
                {item.name}: {pct(item.screeningRate)} screening · n={item.applications}
              </li>
            ))}
          </ul>
        </ApplyFlowCard>
      ) : null}

      {tab === "sources" ? (
        <ApplyFlowCard padding="md" className="mt-4">
          <ul className="grid gap-2 text-sm">
            {sources.map((item) => (
              <li key={item.name}>
                {item.name}: {item.applications} applications
              </li>
            ))}
          </ul>
        </ApplyFlowCard>
      ) : null}

      {tab === "resumes" ? (
        <ApplyFlowCard padding="md" className="mt-4">
          <ul className="grid gap-2 text-sm">
            {resumes.map((item) => (
              <li key={item.name}>
                {item.name}: {pct(item.screeningRate)} · n={item.sampleSize} · {item.confidence}
              </li>
            ))}
          </ul>
        </ApplyFlowCard>
      ) : null}

      {tab === "networking" ? (
        <ApplyFlowCard padding="md" className="mt-4">
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <p>Outreaches enviados: {outreach.sent}</p>
            <p>Respostas recebidas: {outreach.replied}</p>
            <p>Follow-ups pendentes: {outreach.followUpsPending}</p>
            <p>Response rate: {pct(outreach.responseRate)}</p>
          </div>
          <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">{disclaimer}</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {networking.map((item) => (
              <li key={item.name}>
                {item.name}: {pct(item.responseRate)}
              </li>
            ))}
          </ul>
        </ApplyFlowCard>
      ) : null}

      {tab === "gaps" ? (
        <ApplyFlowCard padding="md" className="mt-4">
          <ul className="grid gap-2 text-sm">
            {gaps.map((item) => (
              <li key={item.name}>
                {item.name}: {pct(item.frequency)} high-priority
              </li>
            ))}
          </ul>
          <ul className="mt-4 grid gap-1 text-xs text-[color:var(--af-text-muted)]">
            {gapMap.map((item) => (
              <li key={item.label}>
                {item.label} → {item.action}
              </li>
            ))}
          </ul>
        </ApplyFlowCard>
      ) : null}

      {tab === "insights" ? (
        <ApplyFlowCard padding="md" className="mt-4">
          <ul className="grid gap-3 text-sm">
            {insights.map((item) => (
              <li key={item.id}>
                <p className="font-medium">{item.title}</p>
                <p className="text-[color:var(--af-text-muted)]">{item.description}</p>
                <p className="mt-1 text-xs">n={item.sampleSize} · {item.confidence}</p>
              </li>
            ))}
          </ul>
        </ApplyFlowCard>
      ) : null}
    </ApplyFlowSection>
  );
}
