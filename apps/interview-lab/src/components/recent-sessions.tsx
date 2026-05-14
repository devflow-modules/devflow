"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadSessions } from "@/lib/session-storage";
import { computePracticeInsights } from "@/lib/session-insights";
import { getProblemById } from "@/data/problems";
import { formatDuration } from "@/lib/format-time";

export function RecentSessions() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Evita mismatch de hidratação com dados só em `localStorage` (getSnapshot não existe no SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate intencional pós-mount
    setMounted(true);
  }, []);

  const allSessions = useMemo(() => (mounted ? loadSessions() : []), [mounted]);
  const insights = useMemo(() => computePracticeInsights(allSessions), [allSessions]);
  const sessions = useMemo(() => allSessions.slice(0, 8), [allSessions]);

  if (!mounted || allSessions.length === 0) {
    return (
      <section className="il-card p-5 md:p-6">
        <h2 className="text-lg font-medium text-white">Recent practice</h2>
        <p className="mt-2 text-sm text-neutral-500">
          {mounted ? "No sessions yet — finish a simulation to build your history." : "Loading…"}
        </p>
      </section>
    );
  }

  return (
    <section className="il-card p-5 md:p-6">
      <h2 className="text-lg font-medium text-white">Recent practice</h2>
      <div className="mt-3 space-y-1 rounded-xl border border-neutral-800/80 bg-neutral-950/40 px-3 py-2.5 text-xs text-neutral-400">
        <p>
          <span className="text-neutral-500">Total sessions:</span>{" "}
          <span className="font-medium text-neutral-200">{insights.totalSessions}</span>
        </p>
        {insights.topFreezeReason ? (
          <p>
            <span className="text-neutral-500">Most common freeze:</span>{" "}
            <span className="font-medium text-neutral-200">
              {insights.topFreezeReason.label}{" "}
              <span className="text-neutral-500">({insights.topFreezeReason.count}×)</span>
            </span>
          </p>
        ) : null}
        {insights.avgConfidenceAfter != null ? (
          <p>
            <span className="text-neutral-500">Avg. confidence after:</span>{" "}
            <span className="font-medium text-neutral-200">{insights.avgConfidenceAfter}</span>
            <span className="text-neutral-500"> / 5</span>
          </p>
        ) : null}
        {insights.keyboardRescueYesCount > 0 ? (
          <p>
            <span className="text-neutral-500">Sessions logged “used Keyboard Rescue”:</span>{" "}
            <span className="font-medium text-neutral-200">{insights.keyboardRescueYesCount}</span>
          </p>
        ) : null}
      </div>
      <ul className="mt-4 divide-y divide-neutral-800/80">
        {sessions.map((s) => {
          const title = getProblemById(s.problemId)?.title ?? s.problemId;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
              <div>
                <Link href={`/session/${s.id}`} className="font-medium text-emerald-400 hover:text-emerald-300">
                  {title}
                </Link>
                <p className="text-xs text-neutral-500">{new Date(s.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right text-xs text-neutral-400">
                <div>{formatDuration(s.elapsedTimeSec)}</div>
                <div>
                  Tests: {s.passedTests}/{s.totalTests}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
