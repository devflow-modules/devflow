"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { buildCareerAnalyticsInput } from "@/lib/career-analytics-dataset";
import { loadDashboardAnalytics } from "@/lib/local-analytics-storage";
import { loadDashboardContacts } from "@/lib/local-contact-storage";
import { loadDashboardImport } from "@/lib/local-import-storage";
import { loadDashboardJobs } from "@/lib/local-job-storage";
import {
  buildCareerScorecard,
  computeFunnelMetrics,
  computeGapFrequency,
  computeGapMap,
  computeNetworkingPerformance,
  computeResumePerformance,
  computeRolePerformance,
  computeSourcePerformance,
  computeWeeklyOperatingMetrics,
  generateCareerInsights,
  type ApplyFlowApplication,
  type CareerInsight,
  type CareerScorecard,
} from "@devflow/applyflow-core";

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

export function CareerAnalyticsPanel() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const [scorecard, setScorecard] = useState<CareerScorecard | null>(null);
  const [insights, setInsights] = useState<CareerInsight[]>([]);
  const [funnelBars, setFunnelBars] = useState<{ name: string; count: number }[]>([]);
  const [roles, setRoles] = useState<{ name: string; screeningRate: number; applications: number }[]>([]);
  const [sources, setSources] = useState<{ name: string; applications: number }[]>([]);
  const [resumes, setResumes] = useState<{ name: string; screeningRate: number; confidence: string; sampleSize: number }[]>([]);
  const [networking, setNetworking] = useState<{ name: string; responseRate: number }[]>([]);
  const [gaps, setGaps] = useState<{ name: string; frequency: number }[]>([]);
  const [gapMap, setGapMap] = useState<{ label: string; action: string }[]>([]);
  const [weekly, setWeekly] = useState<{ applications: number; screenings: number; previous?: number } | null>(null);
  const [historyApplications, setHistoryApplications] = useState<ApplyFlowApplication[]>([]);
  const [disclaimer, setDisclaimer] = useState(CAREER_ANALYTICS_DISCLAIMER);

  useEffect(() => {
    const applications = loadDashboardImport()?.applications ?? [];
    setHistoryApplications(applications);
    const jobs = loadDashboardJobs().jobs;
    const analytics = loadDashboardAnalytics();
    const contacts = loadDashboardContacts();
    const input = buildCareerAnalyticsInput({
      applications,
      jobs,
      outcomes: analytics.outcomes,
      events: analytics.events,
      efforts: analytics.efforts,
      contacts: contacts.contacts,
      interactions: contacts.interactions,
    });
    const funnel = computeFunnelMetrics(input);
    setScorecard(buildCareerScorecard(input, "all"));
    setInsights(generateCareerInsights(input));
    setFunnelBars(
      Object.entries(funnel.counts).map(([name, count]) => ({ name, count })),
    );
    setRoles(computeRolePerformance(input).map((item) => ({ name: item.roleType, screeningRate: item.screeningRate, applications: item.applications })));
    setSources(computeSourcePerformance(input).map((item) => ({ name: item.source, applications: item.applications })));
    setResumes(
      computeResumePerformance(input).map((item) => ({
        name: item.resumeVariant,
        screeningRate: item.screeningRate,
        confidence: item.confidence,
        sampleSize: item.sampleSize,
      })),
    );
    const net = computeNetworkingPerformance(input);
    setNetworking(net.map((item) => ({ name: item.cohort, responseRate: item.responseRate })));
    setDisclaimer(net[0]?.disclaimer ?? CAREER_ANALYTICS_DISCLAIMER);
    setGaps(computeGapFrequency(input).map((item) => ({ name: item.label, frequency: item.highPriorityFrequency })));
    setGapMap(computeGapMap(input).map((item) => ({ label: item.label, action: item.suggestedAction })));
    const week = computeWeeklyOperatingMetrics(input, "7d");
    setWeekly({ applications: week.applications, screenings: week.screenings, previous: week.previous?.applications });
    setReady(true);
  }, []);

  const empty = useMemo(() => ready && (scorecard?.applications ?? 0) === 0 && (scorecard?.jobsFound ?? 0) === 0, [ready, scorecard]);

  if (!ready) {
    return <p className="text-sm text-[color:var(--af-text-muted)]">A carregar…</p>;
  }

  return (
    <ApplyFlowSection eyebrow={CAREER_ANALYTICS_EYEBROW} title={CAREER_ANALYTICS_TITLE} description={CAREER_ANALYTICS_HINT}>
      <Link href="/dashboard" className="text-xs text-emerald-300 hover:text-emerald-200">
        Voltar ao dashboard
      </Link>
      <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">{CAREER_ANALYTICS_DISCLAIMER}</p>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Career analytics">
        {(Object.keys(CAREER_ANALYTICS_TABS) as AnalyticsTab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              tab === key
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                : "border-[color:var(--af-border)] text-[color:var(--af-text-muted)]"
            }`}
          >
            {CAREER_ANALYTICS_TABS[key]}
          </button>
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
          <p className="text-xs text-[color:var(--af-text-muted)]">{disclaimer}</p>
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
