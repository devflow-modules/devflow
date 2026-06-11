"use client";

import { InterviewLabButton } from "@/components/ui/InterviewLabButton";
import { useState } from "react";
import type { ProblemDefinition, SessionRecord } from "@/lib/types";
import { buildChatGptSessionExport, buildExplanationTemplate, buildFailedTestsExport } from "@/lib/session-export";

type Props = {
  session: SessionRecord;
  problem: ProblemDefinition | null;
};

export function ChatGptReviewExport({ session, problem }: Props) {
  const [hint, setHint] = useState<string | null>(null);

  const flash = (msg: string) => {
    setHint(msg);
    window.setTimeout(() => setHint(null), 2200);
  };

  const runCopy = async (text: string, okMsg = "Copied.") => {
    try {
      await navigator.clipboard.writeText(text);
      flash(okMsg);
    } catch {
      flash("Copy failed — check browser permissions.");
    }
  };

  const title = problem?.title ?? session.problemId;
  const btn =
    "rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-emerald-500/50 hover:text-white";

  return (
    <section className="il-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">ChatGPT review</h2>
      <p className="mt-1 text-xs text-neutral-500">Copies only when you click. Nothing is sent automatically.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <InterviewLabButton type="button" className={btn} onClick={() => void runCopy(buildChatGptSessionExport({ session, problem }))}>
          Copy session for ChatGPT
        </InterviewLabButton>
        <InterviewLabButton type="button" className={btn} onClick={() => void runCopy(buildFailedTestsExport({ session, problemTitle: title }))}>
          Copy failed tests
        </InterviewLabButton>
        <InterviewLabButton type="button" className={btn} onClick={() => void runCopy(session.code)}>
          Copy code only
        </InterviewLabButton>
        <InterviewLabButton type="button" className={btn} onClick={() => void runCopy(buildExplanationTemplate())}>
          Copy explanation template
        </InterviewLabButton>
      </div>
      {hint ? <p className="mt-2 text-xs text-emerald-400/90">{hint}</p> : null}
    </section>
  );
}
