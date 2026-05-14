"use client";

import { useEffect, useState } from "react";
import type { SessionRecord } from "@/lib/types";
import { FREEZE_REASON_OPTIONS } from "@/lib/types";
import { updateSession } from "@/lib/session-storage";

type Props = {
  sessionId: string;
  initial: SessionRecord;
  onSaved?: () => void;
};

type KbdAnswer = "yes" | "no" | "skip";

function kbdAnswerFromSession(s: SessionRecord): KbdAnswer {
  if (s.keyboardRescueUsed === true) return "yes";
  if (s.keyboardRescueUsed === false) return "no";
  return "skip";
}

export function SessionReflectionForm({ sessionId, initial, onSaved }: Props) {
  const [freeze, setFreeze] = useState<string[]>(initial.freezeReasons ?? []);
  const [after, setAfter] = useState<number | null>(initial.confidenceAfter ?? null);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [spoken, setSpoken] = useState(initial.spokenEnglishNotes ?? "");
  const [kbdAnswer, setKbdAnswer] = useState<KbdAnswer>(() => kbdAnswerFromSession(initial));
  const [kbdNotes, setKbdNotes] = useState(initial.keyboardIssueNotes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- alinhar com sessão recarregada do storage
    setFreeze(initial.freezeReasons ?? []);
    setAfter(initial.confidenceAfter ?? null);
    setNotes(initial.notes ?? "");
    setSpoken(initial.spokenEnglishNotes ?? "");
    setKbdAnswer(kbdAnswerFromSession(initial));
    setKbdNotes(initial.keyboardIssueNotes ?? "");
  }, [initial]);

  const toggleFreeze = (label: string) => {
    setFreeze((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
  };

  const save = () => {
    const keyboardRescueUsed = kbdAnswer === "yes" ? true : kbdAnswer === "no" ? false : null;
    const r = updateSession(sessionId, {
      freezeReasons: freeze,
      ...(after != null ? { confidenceAfter: after } : {}),
      notes: notes.trim(),
      spokenEnglishNotes: spoken.trim(),
      keyboardRescueUsed,
      keyboardIssueNotes: kbdNotes.trim(),
    });
    if (r.ok) {
      setFeedback("Saved.");
      onSaved?.();
      window.setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback("Could not save. Try again.");
    }
  };

  return (
    <section className="il-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Where did you freeze?</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {FREEZE_REASON_OPTIONS.map((label) => (
          <li key={label}>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={freeze.includes(label)}
                onChange={() => toggleFreeze(label)}
                className="mt-0.5 size-4 rounded border-neutral-600 bg-neutral-950 text-emerald-500"
              />
              <span>{label}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-neutral-800/80 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Confidence after this session</h3>
        <p className="mt-1 text-xs text-neutral-500">Optional — 1 = low, 5 = high.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAfter((c) => (c === n ? null : n))}
              className={`size-9 rounded-lg border text-sm font-semibold transition ${
                after === n
                  ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-200"
                  : "border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-800/80 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Keyboard Rescue</h3>
        <p className="mt-1 text-xs text-neutral-500">Optional — reflect after the simulation.</p>
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">Keyboard Rescue usage</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
            <input
              type="radio"
              name="kbd-used"
              className="size-4 border-neutral-600 bg-neutral-950 text-emerald-500"
              checked={kbdAnswer === "skip"}
              onChange={() => setKbdAnswer("skip")}
            />
            <span>Not tracked</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
            <input
              type="radio"
              name="kbd-used"
              className="size-4 border-neutral-600 bg-neutral-950 text-emerald-500"
              checked={kbdAnswer === "no"}
              onChange={() => setKbdAnswer("no")}
            />
            <span>No — I did not use Keyboard Rescue during this session</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
            <input
              type="radio"
              name="kbd-used"
              className="size-4 border-neutral-600 bg-neutral-950 text-emerald-500"
              checked={kbdAnswer === "yes"}
              onChange={() => setKbdAnswer("yes")}
            />
            <span>I used Keyboard Rescue during this session</span>
          </label>
        </fieldset>
        <label className="mt-4 block" htmlFor="kbd-notes">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Keyboard issue notes</span>
          <textarea
            id="kbd-notes"
            value={kbdNotes}
            onChange={(e) => setKbdNotes(e.target.value)}
            rows={2}
            placeholder="Optional — layout, dead keys, symbols you could not type…"
            className="mt-2 w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200 outline-none ring-emerald-500/25 focus:ring-2"
          />
        </label>
      </div>

      <div className="mt-6">
        <label className="block text-xs font-semibold uppercase tracking-wide text-emerald-400/90" htmlFor="session-spoken">
          What I said in English
        </label>
        <textarea
          id="session-spoken"
          value={spoken}
          onChange={(e) => setSpoken(e.target.value)}
          rows={3}
          placeholder="Optional — what you actually said out loud during the simulation…"
          className="mt-2 w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200 outline-none ring-emerald-500/25 focus:ring-2"
        />
      </div>

      <div className="mt-6">
        <label className="block text-xs font-semibold uppercase tracking-wide text-emerald-400/90" htmlFor="session-notes">
          Notes
        </label>
        <textarea
          id="session-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional reflections…"
          className="mt-2 w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200 outline-none ring-emerald-500/25 focus:ring-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
        >
          Save reflection
        </button>
        {feedback ? <span className="text-sm text-emerald-400/90">{feedback}</span> : null}
      </div>
    </section>
  );
}
