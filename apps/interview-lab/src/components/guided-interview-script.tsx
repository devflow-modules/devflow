"use client";

import { useCallback, useMemo, useState } from "react";
import {
  INTERVIEW_SCRIPT_PHASES,
  buildQuickComplexityCopy,
  buildQuickOpeningCopy,
  buildQuickStuckCopy,
} from "@/lib/interview-script";

const promptKey = (phaseId: string, index: number) => `${phaseId}:${index}`;

const btnGhost =
  "rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-[0.65rem] font-medium text-neutral-300 transition hover:border-emerald-500/45 hover:text-emerald-100";

const btnQuick =
  "rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-[0.65rem] font-semibold text-emerald-200/95 transition hover:border-emerald-400/60 hover:bg-emerald-500/15";

export function GuidedInterviewScript() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [spoken, setSpoken] = useState<Set<string>>(() => new Set());
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const showHint = useCallback((msg: string) => {
    setCopyHint(msg);
    window.setTimeout(() => setCopyHint(null), 1600);
  }, []);

  const copyText = useCallback(
    async (text: string, ok = "Copied.") => {
      try {
        await navigator.clipboard.writeText(text);
        showHint(ok);
      } catch {
        showHint("Copy failed.");
      }
    },
    [showHint],
  );

  const togglePhase = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  const toggleSpoken = (key: string) => {
    setSpoken((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const phaseList = useMemo(() => INTERVIEW_SCRIPT_PHASES, []);

  return (
    <div className="il-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Guided interview script</h2>
      <p className="mt-1 text-[0.65rem] leading-snug text-neutral-500">
        Phase-by-phase phrases — expand a section, copy lines, and mark what you already said out loud.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" className={btnQuick} onClick={() => void copyText(buildQuickOpeningCopy())}>
          Copy opening
        </button>
        <button type="button" className={btnQuick} onClick={() => void copyText(buildQuickStuckCopy())}>
          Copy stuck phrase
        </button>
        <button type="button" className={btnQuick} onClick={() => void copyText(buildQuickComplexityCopy())}>
          Copy complexity template
        </button>
      </div>

      {copyHint ? <p className="mt-2 text-[0.65rem] text-emerald-400/90">{copyHint}</p> : null}

      <div className="mt-3 max-h-[min(52vh,28rem)] space-y-1.5 overflow-y-auto pr-0.5">
        {phaseList.map((phase) => {
          const isOpen = Boolean(expanded[phase.id]);
          return (
            <div key={phase.id} className="rounded-lg border border-neutral-800/90 bg-neutral-950/50">
              <button
                type="button"
                onClick={() => togglePhase(phase.id)}
                className="flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left"
                aria-expanded={isOpen}
              >
                <span>
                  <span className="text-xs font-semibold text-neutral-100">{phase.title}</span>
                  <span className="mt-0.5 block text-[0.65rem] leading-snug text-neutral-500">{phase.shortDescription}</span>
                </span>
                <span className="shrink-0 pt-0.5 text-[0.65rem] text-neutral-500">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen ? (
                <ul className="space-y-1.5 border-t border-neutral-800/70 px-2.5 py-2">
                  {phase.prompts.map((line, i) => {
                    const pk = promptKey(phase.id, i);
                    const done = spoken.has(pk);
                    return (
                      <li
                        key={pk}
                        className={`rounded-md border px-2 py-1.5 text-[0.7rem] leading-snug text-neutral-200 ${
                          done ? "border-emerald-500/25 bg-emerald-500/5" : "border-neutral-800/80 bg-neutral-950/60"
                        }`}
                      >
                        <p className={done ? "text-neutral-400 line-through decoration-neutral-500" : ""}>{line}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <button type="button" className={btnGhost} onClick={() => void copyText(line, "Copied.")}>
                            Copy
                          </button>
                          <button type="button" className={btnGhost} onClick={() => toggleSpoken(pk)}>
                            {done ? "Unmark" : "Mark as spoken"}
                          </button>
                          {done ? (
                            <span className="self-center text-[0.6rem] font-medium uppercase tracking-wide text-emerald-500/90">
                              Spoken
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
