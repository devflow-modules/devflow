"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { loadCareerAnalyticsSnapshot } from "@/lib/career-analytics-snapshot";
import { useClientHydrated } from "@/lib/use-client-hydrated";
import { DashboardPersistenceNotice } from "@/components/dashboard/dashboard-persistence-notice";
import { DashboardMigrationPanel } from "@/components/dashboard/dashboard-migration-panel";
import type { ApplyFlowClientPersistenceBootstrapResult } from "@/lib/persistence-v2/dashboard/client-persistence-bootstrap";
import { openDashboardPersistence } from "@/lib/persistence-v2/dashboard/open-dashboard-persistence";
import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import {
  CAREER_ANALYTICS_BACK,
  CAREER_ANALYTICS_DISCLAIMER,
  CAREER_ANALYTICS_EMPTY,
  CAREER_ANALYTICS_EMPTY_CTA,
  CAREER_ANALYTICS_EMPTY_CTA_HREF,
  CAREER_ANALYTICS_EYEBROW,
  CAREER_ANALYTICS_HINT,
  CAREER_ANALYTICS_HISTORY_HINT,
  CAREER_ANALYTICS_MORE_LABEL,
  CAREER_ANALYTICS_PRIMARY_TABS,
  CAREER_ANALYTICS_SUMMARY,
  CAREER_ANALYTICS_TABS,
  CAREER_ANALYTICS_TITLE,
} from "./career-analytics-content";
import { DashboardHistoryCharts } from "./dashboard-history-charts";

type AnalyticsTab = keyof typeof CAREER_ANALYTICS_TABS;

const CHART_TOOLTIP = { background: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7" };

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const SECONDARY_TABS = (Object.keys(CAREER_ANALYTICS_TABS) as AnalyticsTab[]).filter(
  (key) => !(CAREER_ANALYTICS_PRIMARY_TABS as readonly string[]).includes(key),
);

export function CareerAnalyticsPanel({
  persistenceBootstrap,
}: {
  persistenceBootstrap: ApplyFlowClientPersistenceBootstrapResult;
}) {
  const hydrated = useClientHydrated();
  const [usesCloudPersistence, setUsesCloudPersistence] = useState(false);
  const [remoteGate, setRemoteGate] = useState<
    "migration_required" | "auth_required" | "error" | "paused" | "bootstrap_unavailable" | null
  >(null);
  const [remoteDomain, setRemoteDomain] = useState<{
    jobs: ApplyFlowJob[];
    applications: ApplyFlowApplicationV2Envelope[];
  } | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (!persistenceBootstrap.ok) return;
    let cancelled = false;
    void openDashboardPersistence({ bootstrap: persistenceBootstrap.bootstrap }).then((opened) => {
      if (cancelled) return;
      if (opened.kind === "ready") {
        setUsesCloudPersistence(true);
        setRemoteDomain({ jobs: opened.jobs, applications: opened.applications });
        setRemoteGate(null);
        return;
      }
      if (
        opened.kind === "v1" ||
        opened.kind === "v2_offering_empty_pending" ||
        opened.kind === "migration_complete_pending_activation"
      ) {
        setUsesCloudPersistence(false);
        setRemoteDomain(null);
        setRemoteGate(null);
        return;
      }
      setUsesCloudPersistence(false);
      if (opened.kind === "migration_required") setRemoteGate("migration_required");
      else if (opened.kind === "auth_required") setRemoteGate("auth_required");
      else if (opened.kind === "error") setRemoteGate("error");
      else if (opened.kind === "paused") setRemoteGate("paused");
      else if (opened.kind === "bootstrap_unavailable") setRemoteGate("bootstrap_unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, persistenceBootstrap]);
  const snapshot = useMemo(() => {
    if (!hydrated) return null;
    if (usesCloudPersistence) {
      if (!remoteDomain) return null;
      return loadCareerAnalyticsSnapshot({
        jobs: remoteDomain.jobs,
        applications: remoteDomain.applications,
      });
    }
    return loadCareerAnalyticsSnapshot();
  }, [hydrated, usesCloudPersistence, remoteDomain]);
  const [tab, setTab] = useState<AnalyticsTab>("funnel");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();

  const empty = Boolean(
    snapshot && (snapshot.scorecard?.applications ?? 0) === 0 && (snapshot.scorecard?.jobsFound ?? 0) === 0,
  );

  if (!persistenceBootstrap.ok) {
    return <DashboardPersistenceNotice kind="bootstrap_unavailable" />;
  }

  if (remoteGate === "migration_required") {
    return (
      <DashboardMigrationPanel
        onComplete={() => {
          if (!persistenceBootstrap.ok) {
            setRemoteGate("bootstrap_unavailable");
            return;
          }
          void openDashboardPersistence({ bootstrap: persistenceBootstrap.bootstrap }).then((opened) => {
            if (opened.kind === "ready") {
              setUsesCloudPersistence(true);
              setRemoteDomain({ jobs: opened.jobs, applications: opened.applications });
              setRemoteGate(null);
              return;
            }
            if (
              opened.kind === "v1" ||
              opened.kind === "v2_offering_empty_pending" ||
              opened.kind === "migration_complete_pending_activation"
            ) {
              setUsesCloudPersistence(false);
              setRemoteDomain(null);
              setRemoteGate(null);
              return;
            }
            if (
              opened.kind === "migration_required" ||
              opened.kind === "auth_required" ||
              opened.kind === "error" ||
              opened.kind === "paused" ||
              opened.kind === "bootstrap_unavailable"
            ) {
              setRemoteGate(opened.kind);
            }
          });
        }}
      />
    );
  }

  if (remoteGate) {
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

  const funnelMobile = funnelBars.map((item) => ({
    ...item,
    shortName: item.name.length > 14 ? `${item.name.slice(0, 12)}…` : item.name,
  }));

  return (
    <ApplyFlowSection eyebrow={CAREER_ANALYTICS_EYEBROW} title={CAREER_ANALYTICS_TITLE} description={CAREER_ANALYTICS_HINT}>
      <Link href="/dashboard" className="text-xs text-emerald-300 hover:text-emerald-200">
        {CAREER_ANALYTICS_BACK}
      </Link>
      <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_DISCLAIMER}</p>

      {empty ? (
        <ApplyFlowCard variant="muted" padding="md" className="mt-4" data-testid="analytics-empty">
          <p className="text-sm text-[color:var(--af-text)]">{CAREER_ANALYTICS_EMPTY}</p>
          <Link
            href={CAREER_ANALYTICS_EMPTY_CTA_HREF}
            className="mt-3 inline-flex text-sm font-medium text-emerald-300 hover:text-emerald-200"
            data-testid="analytics-empty-cta"
          >
            {CAREER_ANALYTICS_EMPTY_CTA}
          </Link>
        </ApplyFlowCard>
      ) : (
        <>
          {scorecard ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="analytics-summary">
              <ApplyFlowCard padding="sm">
                <p className="text-[11px] text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_SUMMARY.saved}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--af-text)]">{scorecard.jobsFound}</p>
              </ApplyFlowCard>
              <ApplyFlowCard padding="sm">
                <p className="text-[11px] text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_SUMMARY.applications}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--af-text)]">{scorecard.applications}</p>
              </ApplyFlowCard>
              <ApplyFlowCard padding="sm">
                <p className="text-[11px] text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_SUMMARY.screenings}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--af-text)]">{scorecard.screenings}</p>
              </ApplyFlowCard>
              <ApplyFlowCard padding="sm">
                <p className="text-[11px] text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_SUMMARY.offers}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--af-text)]">{scorecard.offers}</p>
              </ApplyFlowCard>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Analytics da busca">
            {CAREER_ANALYTICS_PRIMARY_TABS.map((key) => (
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
            <ApplyFlowButton
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={moreOpen}
              aria-controls={moreId}
              data-testid="analytics-more-toggle"
              onClick={() => setMoreOpen((value) => !value)}
              className="rounded-full px-3 py-1 text-xs font-medium text-[color:var(--af-text-muted)]"
            >
              {CAREER_ANALYTICS_MORE_LABEL}
            </ApplyFlowButton>
            {moreOpen
              ? SECONDARY_TABS.map((key) => (
                  <ApplyFlowButton
                    key={key}
                    type="button"
                    role="tab"
                    variant={tab === key ? "outlineBrand" : "ghost"}
                    size="sm"
                    aria-selected={tab === key}
                    id={moreId}
                    onClick={() => setTab(key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      tab === key
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                        : "border-[color:var(--af-border)] text-[color:var(--af-text-muted)]"
                    }`}
                  >
                    {CAREER_ANALYTICS_TABS[key]}
                  </ApplyFlowButton>
                ))
              : null}
          </div>

          {tab === "overview" && scorecard ? (
            <div className="mt-4 grid gap-4">
              <ApplyFlowCard padding="md">
                <p className="text-sm text-[color:var(--af-text-muted)]">
                  Resposta {pct(scorecard.responseRate)} · Triagem {pct(scorecard.screeningRate)} · Oferta{" "}
                  {pct(scorecard.offerRate)}
                </p>
                {scorecard.averageFit != null ? (
                  <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
                    Match médio nas candidaturas: {scorecard.averageFit}/100
                  </p>
                ) : null}
                {weekly ? (
                  <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
                    Últimos 7 dias: {weekly.applications} candidaturas, {weekly.screenings} triagens
                    {weekly.previous != null ? ` · período anterior: ${weekly.previous}` : ""}
                  </p>
                ) : null}
              </ApplyFlowCard>
              {insights.length > 0 ? (
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    Insights
                  </p>
                  <ul className="mt-2 grid gap-2 text-sm">
                    {insights.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        <ApplyFlowBadge tone={item.confidence === "low" ? "warning" : "intel"}>
                          {item.confidence}
                        </ApplyFlowBadge>{" "}
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </ApplyFlowCard>
              ) : null}
            </div>
          ) : null}

          {tab === "history" ? (
            <div className="mt-4">
              <p className="text-xs text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_HISTORY_HINT}</p>
              <DashboardHistoryCharts applications={historyApplications} />
            </div>
          ) : null}

          {tab === "funnel" ? (
            <ApplyFlowCard padding="md" className="mt-4" data-testid="analytics-funnel">
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelMobile} layout="vertical" margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.6)" />
                    <XAxis type="number" stroke="#71717a" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      width={96}
                      stroke="#71717a"
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Bar dataKey="count" name="Quantidade" fill="#34d399" radius={[0, 4, 4, 0]} />
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
                    {item.name}: {pct(item.screeningRate)} triagem · n={item.applications}
                  </li>
                ))}
              </ul>
            </ApplyFlowCard>
          ) : null}

          {tab === "sources" ? (
            <ApplyFlowCard padding="md" className="mt-4" data-testid="analytics-sources">
              <ul className="grid gap-2 text-sm">
                {sources.length === 0 ? (
                  <li className="text-[color:var(--af-text-muted)]">Ainda sem distribuição por fonte.</li>
                ) : (
                  sources.map((item) => (
                    <li key={item.name}>
                      {item.name}: {item.applications} candidaturas
                    </li>
                  ))
                )}
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
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>Mensagens enviadas: {outreach.sent}</p>
                <p>Respostas: {outreach.replied}</p>
                <p>Follow-ups pendentes: {outreach.followUpsPending}</p>
                <p>Taxa de resposta: {pct(outreach.responseRate)}</p>
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
                    {item.name}: {pct(item.frequency)} alta prioridade
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
                    <p className="mt-1 text-xs">
                      n={item.sampleSize} · {item.confidence}
                    </p>
                  </li>
                ))}
              </ul>
            </ApplyFlowCard>
          ) : null}
        </>
      )}
    </ApplyFlowSection>
  );
}
