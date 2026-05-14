"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { analyzeAtsMatch } from "@/lib/ats/atsAnalyzer";
import type { AtsAnalysisResult } from "@/lib/ats/atsTypes";
import { buildCareerPrepRecordFromAtsAnalysis } from "@/lib/ats/atsPracticeAdapter";
import { appendCareerPrepRecord } from "@/lib/career-prep-storage";
import { practicePathWithCareerPrep } from "@/lib/default-practice-path";

function ScoreCard({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="il-card flex flex-col gap-2 border border-neutral-800/90 bg-neutral-950/50 p-4 sm:p-5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="text-3xl font-semibold tabular-nums text-white">{v}</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-[width] duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="il-card border border-neutral-800/80 p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/95">{title}</h2>
      {subtitle ? <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">None for this pass.</p>;
  }
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-neutral-200">
      {items.map((x, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500/80" aria-hidden />
          <span className="min-w-0">{x}</span>
        </li>
      ))}
    </ul>
  );
}

export function AtsAnalyzerClient() {
  const router = useRouter();
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);

  const canAnalyze = useMemo(() => resume.trim().length > 0 && job.trim().length > 0, [resume, job]);

  const onAnalyze = useCallback(() => {
    setError(null);
    if (!resume.trim()) {
      setError("Paste your resume text to continue.");
      setResult(null);
      return;
    }
    if (!job.trim()) {
      setError("Paste the job description to continue.");
      setResult(null);
      return;
    }
    setBusy(true);
    try {
      setResult(analyzeAtsMatch(resume, job));
    } finally {
      setBusy(false);
    }
  }, [resume, job]);

  const onPractice = useCallback(() => {
    if (!result) return;
    const id = crypto.randomUUID();
    const record = buildCareerPrepRecordFromAtsAnalysis(result, id, new Date().toISOString());
    appendCareerPrepRecord(record);
    router.push(practicePathWithCareerPrep(id));
  }, [result, router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-10 md:max-w-5xl md:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">DevFlow Career Suite</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">ATS-style resume match</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          Paste your resume and a job description. This page runs a <strong className="text-neutral-200">deterministic</strong>{" "}
          keyword and seniority heuristic — <strong className="text-neutral-200">not</strong> a certified ATS parser and{" "}
          <strong className="text-neutral-200">no</strong> external API. Use it to spot gaps, tune bullets, then jump into
          interview practice with the same prep panel as ApplyFlow imports.
        </p>
        <Link href="/" className="inline-block text-sm font-medium text-emerald-400/90 hover:text-emerald-300">
          ← Home
        </Link>
      </header>

      <section className="il-card space-y-5 p-5 md:p-6">
        <div className="space-y-2">
          <label htmlFor="ats-resume" className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Resume text
          </label>
          <textarea
            id="ats-resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder="Paste the plain text of your resume…"
            className="w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm leading-relaxed text-neutral-100 outline-none ring-emerald-500/20 focus:ring-2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="ats-job" className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Job description
          </label>
          <textarea
            id="ats-job"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder="Paste the job posting (requirements + nice-to-haves)…"
            className="w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm leading-relaxed text-neutral-100 outline-none ring-emerald-500/20 focus:ring-2"
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/95" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canAnalyze || busy}
            onClick={onAnalyze}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Analyzing…" : "Analyze ATS match"}
          </button>
          <p className="text-xs text-neutral-500">All processing happens in this browser tab.</p>
        </div>
      </section>

      {result ? (
        <div className="flex flex-col gap-8">
          <Section
            title="1. Match overview"
            subtitle="Weighted heuristic scores (0–100). Same inputs always yield the same output on this build."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <ScoreCard label="Overall" value={result.overallScore} />
              <ScoreCard label="Technical keywords" value={result.technicalScore} />
              <ScoreCard label="Seniority signals" value={result.seniorityScore} />
              <ScoreCard label="Vocabulary coverage" value={result.keywordCoverageScore} />
              <ScoreCard label="Interview readiness" value={result.interviewReadinessScore} />
            </div>
          </Section>

          <Section title="2. Matched keywords" subtitle="Canonical tech terms from the job description that also appear in your resume.">
            <div className="flex flex-wrap gap-2">
              {result.matchedKeywords.length === 0 ? (
                <span className="text-sm text-neutral-500">No canonical tech matches yet — check wording or add explicit stack lines.</span>
              ) : (
                result.matchedKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100/95"
                  >
                    {k}
                  </span>
                ))
              )}
            </div>
          </Section>

          <Section title="3. Missing keywords" subtitle="Job mentions these stack signals, but they were not detected in the resume text.">
            <div className="flex flex-wrap gap-2">
              {result.missingKeywords.length === 0 ? (
                <span className="text-sm text-neutral-500">None from the canonical list — still review vocabulary coverage.</span>
              ) : (
                result.missingKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100/95"
                  >
                    {k}
                  </span>
                ))
              )}
            </div>
          </Section>

          <Section title="4. Strengths">
            <BulletList items={result.strengths} />
          </Section>

          <Section title="5. Gaps to improve" subtitle="Heuristic weak signals — use as a checklist, not a verdict.">
            <BulletList items={result.weakSignals} />
          </Section>

          <Section title="6. Suggested resume improvements" subtitle="Action items plus draft bullets — edit with your real metrics before sending.">
            <div className="space-y-4">
              <BulletList items={result.improvementSuggestions} />
              {result.rewrittenBullets.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No bullet-like lines detected — add lines starting with “- ” or “• ” for richer drafts.
                </p>
              ) : (
                <ul className="space-y-4 border-t border-neutral-800/80 pt-4">
                  {result.rewrittenBullets.map((b, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-neutral-800/90 bg-neutral-950/60 p-4 text-sm leading-relaxed"
                    >
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-neutral-500">Original</p>
                      <p className="mt-1 text-neutral-300">{b.original}</p>
                      <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-500/90">Improved draft</p>
                      <p className="mt-1 text-emerald-100/95">{b.improved}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          <Section title="7. Likely interview questions" subtitle="Derived from gaps and strengths — practice answers out loud.">
            <BulletList items={result.likelyInterviewQuestions} />
          </Section>

          <Section
            title="8. Practice handoff"
            subtitle="Saves a prep record locally (same storage as ApplyFlow handoff) and opens the default practice room with the prep panel."
          >
            <p className="text-sm text-neutral-300">{result.practiceContext.suggestedPitch}</p>
            <button
              type="button"
              onClick={onPractice}
              className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/70 hover:bg-emerald-500/25"
            >
              Practice interview from this analysis
            </button>
          </Section>
        </div>
      ) : null}
    </div>
  );
}
