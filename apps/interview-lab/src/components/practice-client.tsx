"use client";

import { InterviewLabButton } from "@/components/ui/InterviewLabButton";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChecklistId, ChecklistState, ProblemDefinition, TestOutcome } from "@/lib/types";
import { CHECKLIST_ITEMS, TIMER_TOTAL_SEC, emptyChecklist } from "@/lib/types";
import type { NoSilenceMode } from "@/lib/no-silence";
import {
  NO_SILENCE_MODE_DEFAULT,
  formatNoSilenceModeLabel,
  getNudgeIntervalSeconds,
  getNudgeMessageAtIndex,
} from "@/lib/no-silence";
import { CareerPrepPanel } from "@/components/career-prep-panel";
import { GuidedInterviewScript } from "@/components/guided-interview-script";
import { KeyboardRescueKit } from "@/components/keyboard-rescue-kit";
import { formatClock } from "@/lib/format-time";
import { loadCareerPrepById, type CareerPrepRecord } from "@/lib/career-prep-storage";
import { appendSession } from "@/lib/session-storage";
import { countPassed, expectedTestCount, runProblemTests } from "@/lib/run-user-solve";

type Props = { problem: ProblemDefinition; careerPrepId?: string };

export function PracticeClient({ problem, careerPrepId }: Props) {
  const router = useRouter();
  const [code, setCode] = useState(problem.starterCode);
  const [remainingSec, setRemainingSec] = useState(TIMER_TOTAL_SEC);
  const [timerRunning, setTimerRunning] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistState>(emptyChecklist());
  const [outcomes, setOutcomes] = useState<TestOutcome[] | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [confidenceBefore, setConfidenceBefore] = useState<number | null>(null);
  const [noSilenceMode, setNoSilenceMode] = useState<NoSilenceMode>(NO_SILENCE_MODE_DEFAULT);
  const noSilenceModeRef = useRef<NoSilenceMode>(NO_SILENCE_MODE_DEFAULT);
  noSilenceModeRef.current = noSilenceMode;
  const [secondsSinceNudgeReset, setSecondsSinceNudgeReset] = useState(0);
  const [nudgeMessageIndex, setNudgeMessageIndex] = useState(0);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [manualSpeakResetCount, setManualSpeakResetCount] = useState(0);
  const lastTestMeta = useRef<{ passed: number; total: number } | null>(null);
  const [careerPrep, setCareerPrep] = useState<CareerPrepRecord | null>(null);

  useEffect(() => {
    if (!careerPrepId) {
      setCareerPrep(null);
      return;
    }
    setCareerPrep(loadCareerPrepById(careerPrepId));
  }, [careerPrepId]);

  useEffect(() => {
    setCode(problem.starterCode);
    setRemainingSec(TIMER_TOTAL_SEC);
    setTimerRunning(true);
    setChecklist(emptyChecklist());
    setOutcomes(null);
    setConfidenceBefore(null);
    setNoSilenceMode(NO_SILENCE_MODE_DEFAULT);
    setSecondsSinceNudgeReset(0);
    setNudgeMessageIndex(0);
    setNudgeCount(0);
    setManualSpeakResetCount(0);
    lastTestMeta.current = null;
  }, [problem]);

  useEffect(() => {
    setSecondsSinceNudgeReset(0);
  }, [noSilenceMode]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
      setSecondsSinceNudgeReset((prev) => {
        const intv = getNudgeIntervalSeconds(noSilenceModeRef.current);
        if (intv <= 0) return 0;
        const next = prev + 1;
        if (next >= intv) {
          setNudgeCount((c) => c + 1);
          setNudgeMessageIndex((i) => i + 1);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (remainingSec === 0) setTimerRunning(false);
  }, [remainingSec]);

  const elapsedTimeSec = TIMER_TOTAL_SEC - remainingSec;
  const nudgeInterval = getNudgeIntervalSeconds(noSilenceMode);
  const nextNudgeMessage =
    nudgeInterval <= 0 ? "Nudges disabled." : getNudgeMessageAtIndex(nudgeMessageIndex);
  const nextNudgeInSec =
    nudgeInterval <= 0 ? null : Math.max(0, nudgeInterval - secondsSinceNudgeReset);

  const toggleCheck = useCallback((id: ChecklistId) => {
    setChecklist((c) => ({ ...c, [id]: !c[id] }));
  }, []);

  const handleRun = useCallback(async () => {
    setRunningTests(true);
    setOutcomes(null);
    try {
      const result = await runProblemTests(code, problem);
      setOutcomes(result);
      lastTestMeta.current = { passed: countPassed(result), total: result.length };
    } catch (e) {
      setOutcomes([
        {
          id: "runner",
          pass: false,
          detail: e instanceof Error ? e.message : String(e),
        },
      ]);
      lastTestMeta.current = { passed: 0, total: 1 };
    } finally {
      setRunningTests(false);
    }
  }, [code, problem]);

  const handleFinish = useCallback(() => {
    setTimerRunning(false);
    const meta = lastTestMeta.current;
    const totalTests = meta?.total ?? expectedTestCount(problem);
    const passedTests = meta?.passed ?? 0;
    const id = crypto.randomUUID();
    appendSession({
      id,
      problemId: problem.id,
      code,
      elapsedTimeSec,
      checklist,
      passedTests,
      totalTests,
      createdAt: new Date().toISOString(),
      ...(confidenceBefore != null ? { confidenceBefore } : {}),
      ...(outcomes && outcomes.length > 0 ? { testOutcomes: outcomes } : {}),
      noSilenceMode,
      nudgeCount,
      manualSpeakResetCount,
    });
    router.push(`/session/${id}`);
  }, [
    checklist,
    code,
    confidenceBefore,
    elapsedTimeSec,
    manualSpeakResetCount,
    noSilenceMode,
    nudgeCount,
    outcomes,
    problem,
    router,
  ]);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,340px)]">
      <aside className="il-card flex flex-col gap-4 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        <div>
          <h1 className="text-lg font-semibold text-white">{problem.title}</h1>
          <p className="mt-1 text-xs text-neutral-500">
            {problem.difficulty} · {problem.pattern}
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Prompt</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">{problem.prompt}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Examples</h2>
          <ul className="mt-2 space-y-3">
            {problem.examples.map((ex, i) => (
              <li key={i} className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 text-xs">
                <div className="text-neutral-500">
                  <span className="font-medium text-neutral-400">Input:</span> {ex.input}
                </div>
                <div className="mt-1 text-neutral-500">
                  <span className="font-medium text-neutral-400">Output:</span> {ex.output}
                </div>
                {ex.explanation ? (
                  <div className="mt-1 text-neutral-500">{ex.explanation}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Constraints</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-neutral-400">
            {problem.constraints.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="il-card flex min-h-[520px] flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800/80 pb-3">
          <InterviewLabButton
            type="button"
            onClick={handleRun}
            disabled={runningTests}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {runningTests ? "Running…" : "Run tests"}
          </InterviewLabButton>
          <InterviewLabButton
            type="button"
            onClick={handleFinish}
            className="rounded-xl border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-400"
          >
            Finish simulation
          </InterviewLabButton>
        </div>
        <label className="mt-3 flex flex-1 flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">JavaScript</span>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="min-h-[280px] flex-1 resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm leading-relaxed text-emerald-100/95 outline-none ring-emerald-500/30 focus:ring-2 lg:min-h-[360px]"
          />
        </label>
        <TestResults outcomes={outcomes} />
      </main>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        {careerPrep ? <CareerPrepPanel record={careerPrep} /> : null}

        <div className="il-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Confidence before this session</h2>
          <p className="mt-1 text-xs text-neutral-500">Optional · tap again to clear.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <InterviewLabButton
                key={n}
                type="button"
                onClick={() => setConfidenceBefore((c) => (c === n ? null : n))}
                className={`size-9 rounded-lg border text-sm font-semibold transition ${
                  confidenceBefore === n
                    ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-200"
                    : "border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {n}
              </InterviewLabButton>
            ))}
          </div>
        </div>

        <div className="il-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Timer</h2>
          <p className="mt-3 text-center font-mono text-4xl font-semibold text-white tabular-nums">
            {formatClock(remainingSec)}
          </p>
          <p className="mt-1 text-center text-xs text-neutral-500">25 minutes · counts down</p>
          <InterviewLabButton
            type="button"
            onClick={() => setTimerRunning((t) => !t)}
            className="mt-3 w-full rounded-lg border border-neutral-700 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-500"
          >
            {timerRunning ? "Pause" : "Resume"}
          </InterviewLabButton>

          <div className="mt-4 border-t border-neutral-800/70 pt-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-400/90">No Silence Mode</p>
            <div className="mt-2 flex gap-1">
              {(["off", "gentle", "interview"] as const).map((m) => (
                <InterviewLabButton
                  key={m}
                  type="button"
                  onClick={() => setNoSilenceMode(m)}
                  className={`flex-1 rounded-md border px-1 py-1.5 text-[0.6rem] font-semibold transition ${
                    noSilenceMode === m
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-100"
                      : "border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {formatNoSilenceModeLabel(m)}
                </InterviewLabButton>
              ))}
            </div>
            <p className="mt-2 text-[0.65rem] text-neutral-500">
              No Silence: <span className="text-neutral-300">{formatNoSilenceModeLabel(noSilenceMode)}</span>
            </p>
            <p className="mt-1 text-[0.65rem] leading-snug text-neutral-400">
              <span className="font-medium text-neutral-500">Next message · </span>
              {nextNudgeMessage}
            </p>
            <p className="mt-1 text-[0.65rem] text-neutral-500">
              {nextNudgeInSec != null ? (
                <>
                  Next nudge in <span className="tabular-nums text-neutral-300">{nextNudgeInSec}s</span>
                </>
              ) : (
                <span className="text-neutral-600">—</span>
              )}
            </p>
            <InterviewLabButton
              type="button"
              onClick={() => {
                setSecondsSinceNudgeReset(0);
                setManualSpeakResetCount((c) => c + 1);
              }}
              className="mt-2 w-full rounded-lg border border-neutral-600 py-1.5 text-[0.65rem] font-medium text-neutral-200 hover:border-emerald-500/40"
            >
              I said something
            </InterviewLabButton>
          </div>
        </div>

        <div className="il-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Interview checklist</h2>
          <ul className="mt-3 space-y-2">
            {CHECKLIST_ITEMS.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={checklist[item.id]}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-1 size-4 rounded border-neutral-600 bg-neutral-950 text-emerald-500"
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <GuidedInterviewScript />

        <KeyboardRescueKit />
      </aside>
    </div>
  );
}

function TestResults({ outcomes }: { outcomes: TestOutcome[] | null }) {
  if (!outcomes) {
    return <p className="mt-4 text-sm text-neutral-500">Run tests to see results here.</p>;
  }

  return (
    <div className="mt-4 border-t border-neutral-800/80 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Test results</h3>
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
        {outcomes.map((o) => (
          <li
            key={o.id}
            className={`rounded-lg border px-3 py-2 font-mono text-xs ${
              o.pass ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200" : "border-red-500/25 bg-red-500/5 text-red-200/90"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span>{o.id}</span>
              <span className="font-sans text-[0.7rem] font-semibold uppercase">{o.pass ? "passed" : "failed"}</span>
            </div>
            {!o.pass && o.detail ? <p className="mt-1 font-sans text-[0.7rem] leading-snug text-neutral-300">{o.detail}</p> : null}
            {!o.pass && o.expected !== undefined ? (
              <p className="mt-1 font-sans text-[0.65rem] text-neutral-500">
                Expected: {JSON.stringify(o.expected)} · Received: {JSON.stringify(o.received)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
