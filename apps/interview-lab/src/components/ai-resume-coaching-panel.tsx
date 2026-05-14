"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadAiAnswerReviewSettings } from "@/lib/ai-answer-review-storage";
import { generateAiResumeCoaching } from "@/lib/ats/aiResumeCoachingClient";
import { AI_COACHING_BADGE_LABEL, coachingUnavailableMessage } from "@/lib/ats/aiResumeCoachingFallback";
import type { AiResumeCoachingInput, AiResumeCoachingResult } from "@/lib/ats/aiResumeCoachingTypes";
import type { AtsAnalysisResult } from "@/lib/ats/atsTypes";

type Props = {
  resumeText: string;
  jobDescriptionText: string;
  atsAnalysis: AtsAnalysisResult;
};

export function AiResumeCoachingPanel({ resumeText, jobDescriptionText, atsAnalysis }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coaching, setCoaching] = useState<AiResumeCoachingResult | null>(null);

  useEffect(() => {
    setCoaching(null);
    setError(null);
    setLoading(false);
  }, [resumeText, jobDescriptionText, atsAnalysis]);

  const onGenerate = useCallback(async () => {
    setError(null);
    const settings = loadAiAnswerReviewSettings();
    const unavailable = coachingUnavailableMessage(settings);
    if (unavailable) {
      setError(unavailable);
      setCoaching(null);
      return;
    }

    const input: AiResumeCoachingInput = {
      resumeText,
      jobDescriptionText,
      atsAnalysis,
    };

    setLoading(true);
    try {
      const r = await generateAiResumeCoaching(input, settings);
      if (!r.ok) {
        setCoaching(null);
        setError(r.message);
        return;
      }
      setCoaching(r.data);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [resumeText, jobDescriptionText, atsAnalysis]);

  const settings = loadAiAnswerReviewSettings();
  const blocked = Boolean(coachingUnavailableMessage(settings));

  return (
    <section className="il-card border border-violet-500/25 bg-gradient-to-b from-violet-500/[0.06] to-neutral-950/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-300/95">AI Resume Coaching</h2>
            <span className="rounded-full border border-violet-500/35 bg-violet-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-violet-200/90">
              {AI_COACHING_BADGE_LABEL}
            </span>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">
            Use AI to turn this match analysis into sharper resume bullets, a job-specific pitch, and interview talking
            points — <strong className="text-neutral-100">only after</strong> you click the button below.
          </p>
          <p className="max-w-2xl text-xs leading-relaxed text-neutral-500">
            Start with a private local match analysis. Use AI only when you want deeper coaching. Optional: your resume
            and job description are sent to OpenAI <strong className="text-neutral-300">only when you choose</strong>{" "}
            to generate coaching (same optional API key as{" "}
            <Link href="/ai-review" className="text-emerald-400/90 underline-offset-2 hover:underline">
              AI Answer Review
            </Link>
            ).
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          disabled={loading || blocked}
          onClick={() => void onGenerate()}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate AI coaching"}
        </button>
        {blocked ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/95">
            {coachingUnavailableMessage(settings)}
            <span className="mt-1 block text-amber-200/80">
              There is no server-side API key in this MVP — configure your key locally on the AI Answer Review page, or
              keep using the deterministic analysis only.
            </span>
          </p>
        ) : null}
        {error && !blocked ? (
          <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-100/95" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {coaching ? (
        <div className="mt-8 space-y-8 border-t border-neutral-800/80 pt-8">
          <Block title="1. Professional summary" body={coaching.professionalSummary} />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300/90">2. Rewritten resume bullets</h3>
            <ul className="mt-3 space-y-4">
              {coaching.rewrittenBullets.map((b, i) => (
                <li key={i} className="rounded-xl border border-neutral-800/90 bg-neutral-950/55 p-4 text-sm">
                  <p className="text-[0.65rem] font-semibold uppercase text-neutral-500">Original</p>
                  <p className="mt-1 text-neutral-300">{b.original}</p>
                  <p className="mt-2 text-[0.65rem] font-semibold uppercase text-violet-400/90">Improved</p>
                  <p className="mt-1 text-neutral-100">{b.improved}</p>
                  <p className="mt-2 text-[0.65rem] font-semibold uppercase text-neutral-500">Why</p>
                  <p className="mt-1 text-xs text-neutral-400">{b.reason}</p>
                </li>
              ))}
            </ul>
          </div>
          <Block title="3. Job-specific pitch" body={coaching.jobSpecificPitch} />
          <ListBlock title="4. Interview talking points" items={coaching.interviewTalkingPoints} />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300/90">
              5. Weakness defense strategy
            </h3>
            <ul className="mt-3 space-y-3">
              {coaching.weaknessDefenseStrategy.map((w, i) => (
                <li key={i} className="rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-4 text-sm">
                  <p className="text-[0.65rem] font-semibold uppercase text-neutral-500">Gap</p>
                  <p className="mt-1 text-neutral-200">{w.gap}</p>
                  <p className="mt-3 text-[0.65rem] font-semibold uppercase text-emerald-400/85">Suggested answer</p>
                  <p className="mt-1 text-neutral-300">{w.suggestedAnswer}</p>
                </li>
              ))}
            </ul>
          </div>
          <ListBlock title="6. Resume optimization checklist" items={coaching.resumeOptimizationChecklist} />
          <Block title="7. Final recommendation" body={coaching.finalRecommendation} />
        </div>
      ) : null}
    </section>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300/90">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{body}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300/90">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-neutral-200">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500/80" aria-hidden />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
