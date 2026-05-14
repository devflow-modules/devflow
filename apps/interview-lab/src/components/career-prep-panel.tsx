"use client";

import type { CareerPrepRecord } from "@/lib/career-prep-storage";

type Props = { record: CareerPrepRecord };

function PrepBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-neutral-800/90 bg-neutral-950/55 p-3 sm:p-4">
      <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-400/95">{title}</h3>
      <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-neutral-200 sm:text-[13px]">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500/70" aria-hidden />
            <span className="min-w-0">{x}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CareerPrepPanel({ record }: Props) {
  const { preparation: p } = record;
  return (
    <div className="il-card border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.07] to-neutral-950/40 p-4 sm:p-5">
      <header className="border-b border-neutral-800/80 pb-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-emerald-400/90">
          {record.prepSource === "ats" ? "ATS-style match · interview prep" : "ApplyFlow · interview prep"}
        </p>
        <h2 className="mt-2 break-words text-lg font-semibold leading-snug text-white sm:text-xl">{record.role}</h2>
        <p className="mt-1 text-sm text-neutral-400">
          <span className="font-medium text-neutral-200">{record.company}</span>
          <span className="mx-1.5 text-neutral-600">·</span>
          <span className="text-neutral-500">Deterministic prompts (no AI)</span>
          <span className="mx-1.5 text-neutral-600">·</span>
          <span className="tabular-nums text-neutral-400">~{p.estimatedSessionMinutes} min</span>
        </p>
      </header>

      <div className="mt-4 max-h-[min(70vh,36rem)] space-y-3 overflow-y-auto pr-0.5">
        <PrepBlock title="Focus areas" items={p.focusAreas} />
        <PrepBlock title="Technical questions" items={p.technicalQuestions} />
        <PrepBlock title="Behavioral questions" items={p.behavioralQuestions} />
        <PrepBlock title="Speaking prompts" items={p.speakingPrompts} />
        <PrepBlock title="Live coding hints" items={p.liveCodingHints} />
      </div>
    </div>
  );
}
