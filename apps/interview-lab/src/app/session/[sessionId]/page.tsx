"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProblemById } from "@/data/problems";
import { ChatGptReviewExport } from "@/components/chatgpt-review-export";
import { SessionReflectionForm } from "@/components/session-reflection-form";
import { buildImprovementBullets, checklistSummary } from "@/lib/improvements";
import { loadSessionById } from "@/lib/session-storage";
import { formatDuration } from "@/lib/format-time";
import { formatNoSilenceModeLabel } from "@/lib/no-silence";
import { formatKeyboardRescueUsed } from "@/lib/session-export";

export default function SessionReviewPage() {
  const params = useParams();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<ReturnType<typeof loadSessionById>>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate intencional pós-mount (localStorage)
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !sessionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronizar com localStorage após mount / mudança de id
    setSession(loadSessionById(sessionId));
  }, [mounted, sessionId]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Loading review…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-white">Session not found</h1>
        <p className="mt-2 text-neutral-400">This review link is invalid or the session was cleared from storage.</p>
        <Link href="/" className="mt-6 inline-block text-emerald-400 hover:text-emerald-300">
          Back to home
        </Link>
      </div>
    );
  }

  const problem = getProblemById(session.problemId);
  const title = problem?.title ?? session.problemId;
  const improvements = buildImprovementBullets(session, title);
  const checklist = checklistSummary(session.checklist);

  const refreshSession = () => {
    setSession(loadSessionById(sessionId));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">
        ← Home
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-white">Session review</h1>
      <p className="mt-1 text-neutral-400">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{new Date(session.createdAt).toLocaleString()}</p>

      <div className="mt-8 grid gap-6">
        <section className="il-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Summary</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
              <dt className="text-neutral-500">Time in chair</dt>
              <dd className="font-medium text-white">{formatDuration(session.elapsedTimeSec)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
              <dt className="text-neutral-500">Tests passed</dt>
              <dd className="font-medium text-white">
                {session.passedTests} / {session.totalTests}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
              <dt className="text-neutral-500">No Silence mode</dt>
              <dd className="font-medium text-white">
                {session.noSilenceMode != null ? formatNoSilenceModeLabel(session.noSilenceMode) : "Not tracked"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
              <dt className="text-neutral-500">Nudges shown</dt>
              <dd className="font-medium text-white">
                {session.nudgeCount != null ? String(session.nudgeCount) : "Not tracked"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
              <dt className="text-neutral-500">Manual speak resets</dt>
              <dd className="font-medium text-white">
                {session.manualSpeakResetCount != null ? String(session.manualSpeakResetCount) : "Not tracked"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
              <dt className="text-neutral-500">Keyboard Rescue (reflection)</dt>
              <dd className="font-medium text-white">{formatKeyboardRescueUsed(session.keyboardRescueUsed)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
              <dt className="text-neutral-500">Keyboard issue notes</dt>
              <dd className="font-medium text-white">
                {session.keyboardIssueNotes?.trim() ? session.keyboardIssueNotes.trim() : "Not provided."}
              </dd>
            </div>
            {session.confidenceBefore != null ? (
              <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
                <dt className="text-neutral-500">Confidence before</dt>
                <dd className="font-medium text-white">{session.confidenceBefore} / 5</dd>
              </div>
            ) : null}
            {session.confidenceAfter != null ? (
              <div className="flex justify-between gap-4 border-b border-neutral-800/80 py-2">
                <dt className="text-neutral-500">Confidence after</dt>
                <dd className="font-medium text-white">{session.confidenceAfter} / 5</dd>
              </div>
            ) : null}
            {session.freezeReasons && session.freezeReasons.length > 0 ? (
              <div className="border-b border-neutral-800/80 py-2">
                <dt className="text-neutral-500">Freeze tags</dt>
                <dd className="mt-1 text-neutral-200">{session.freezeReasons.join(" · ")}</dd>
              </div>
            ) : null}
            {session.spokenEnglishNotes?.trim() ? (
              <div className="py-2">
                <dt className="text-neutral-500">What I said in English</dt>
                <dd className="mt-1 whitespace-pre-wrap text-neutral-200">{session.spokenEnglishNotes}</dd>
              </div>
            ) : null}
            {session.notes?.trim() ? (
              <div className="py-2">
                <dt className="text-neutral-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-neutral-200">{session.notes}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="il-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Checklist</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {checklist.map((row) => (
              <li key={row.id} className="flex items-center gap-2">
                <span className={row.done ? "text-emerald-400" : "text-neutral-600"}>{row.done ? "✓" : "○"}</span>
                <span className={row.done ? "text-neutral-200" : "text-neutral-500"}>{row.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <SessionReflectionForm key={sessionId} sessionId={sessionId} initial={session} onSaved={refreshSession} />

        <ChatGptReviewExport session={session} problem={problem ?? null} />

        {problem ? (
          <>
            <section className="il-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Ideal approach</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">{problem.idealApproach}</p>
            </section>
            <section className="il-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Complexity</h2>
              <p className="mt-3 text-sm text-neutral-300">{problem.complexity}</p>
            </section>
          </>
        ) : null}

        <section className="il-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Next improvements</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-300">
            {improvements.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/practice/${session.problemId}`}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
          >
            Retry same problem
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
          >
            Pick another problem
          </Link>
        </div>
      </div>
    </div>
  );
}
