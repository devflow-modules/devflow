"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMERGENCY_SYMBOL_VALUES,
  KEYBOARD_CHECKLIST_ITEMS,
  KEYBOARD_SAFE_SNIPPETS,
  KEYBOARD_RESCUE_SYMBOL_CATEGORIES,
  type KeyboardChecklistItem,
  symbolsGroupedByCategory,
} from "@/lib/keyboard-rescue";

type TabId = "symbols" | "snippets" | "checklist";

export function KeyboardRescueKit() {
  const [tab, setTab] = useState<TabId>("symbols");
  const [copyLine, setCopyLine] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!copyLine) return;
    const t = window.setTimeout(() => setCopyLine(null), 2000);
    return () => window.clearTimeout(t);
  }, [copyLine]);

  const copyText = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyLine("Copied.");
    } catch {
      setCopyLine("Copy failed.");
    }
  }, []);

  const grouped = symbolsGroupedByCategory();

  const toggleCheck = (id: string) => {
    setChecklist((c) => ({ ...c, [id]: !c[id] }));
  };

  const copySnippetForChecklist = (item: KeyboardChecklistItem) => {
    if (item.id === "kbd-freq-snippet") {
      const snip = KEYBOARD_SAFE_SNIPPETS.find((s) => s.id === "snippet-frequency-map-no-or-or");
      if (snip) void copyText(snip.code);
      return;
    }
    if (item.symbolValue) void copyText(item.symbolValue);
  };

  return (
    <div className="il-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Keyboard Rescue Kit</h2>
      <p className="mt-1 text-xs text-neutral-500">Copy emergency symbols instead of freezing.</p>

      <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
        <h3 className="text-[0.65rem] font-semibold uppercase tracking-wide text-amber-200/90">I can’t type this symbol</h3>
        <p className="mt-1 text-[0.65rem] leading-snug text-neutral-400">
          Copy the symbol or use a keyboard-safe snippet instead of getting stuck.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {EMERGENCY_SYMBOL_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => void copyText(v)}
              className="rounded-md border border-amber-500/30 bg-neutral-950 px-2 py-1 font-mono text-[0.65rem] text-amber-100/90 hover:border-amber-400/50"
            >
              Copy {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-1 rounded-lg border border-neutral-800 bg-neutral-950/50 p-0.5">
        {(
          [
            ["symbols", "Symbols"],
            ["snippets", "Snippets"],
            ["checklist", "Checklist"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[0.65rem] font-semibold transition ${
              tab === id ? "bg-emerald-500/20 text-emerald-100" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {copyLine ? <p className="mt-2 text-xs text-emerald-400/90">{copyLine}</p> : null}

      {tab === "symbols" ? (
        <div className="mt-3 space-y-4">
          {KEYBOARD_RESCUE_SYMBOL_CATEGORIES.map((cat) => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <div key={cat}>
                <h4 className="text-[0.6rem] font-semibold uppercase tracking-wide text-neutral-500">{cat}</h4>
                <ul className="mt-2 space-y-2">
                  {items.map((sym) => (
                    <li
                      key={sym.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-neutral-800/80 bg-neutral-950/40 px-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs text-emerald-200/90">{sym.label}</span>
                        <p className="mt-0.5 text-[0.6rem] leading-snug text-neutral-500">{sym.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyText(sym.value)}
                        className="shrink-0 rounded border border-neutral-600 px-2 py-0.5 text-[0.6rem] font-medium text-neutral-200 hover:border-emerald-500/40"
                      >
                        Copy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "snippets" ? (
        <div className="mt-3 space-y-4">
          <p className="text-[0.65rem] text-neutral-500">Keyboard-safe snippets</p>
          {KEYBOARD_SAFE_SNIPPETS.map((snip) => (
            <div key={snip.id} className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-200">{snip.title}</h4>
                  <p className="mt-1 text-[0.65rem] text-neutral-500">{snip.description}</p>
                  {snip.pattern ? <p className="mt-1 text-[0.6rem] text-neutral-600">{snip.pattern}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void copyText(snip.code)}
                  className="shrink-0 rounded border border-neutral-600 px-2 py-1 text-[0.6rem] font-medium text-neutral-200 hover:border-emerald-500/40"
                >
                  Copy snippet
                </button>
              </div>
              <pre className="mt-2 max-h-40 overflow-auto rounded border border-neutral-800/80 bg-neutral-950 p-2 font-mono text-[0.6rem] leading-relaxed text-emerald-100/85">
                {snip.code}
              </pre>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "checklist" ? (
        <div className="mt-3 space-y-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-neutral-500">Keyboard checklist</p>
          <ul className="space-y-2">
            {KEYBOARD_CHECKLIST_ITEMS.map((item) => (
              <li key={item.id} className="rounded-md border border-neutral-800/80 bg-neutral-950/40 p-2">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(checklist[item.id])}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-0.5 size-4 rounded border-neutral-600 bg-neutral-950 text-emerald-500"
                  />
                  <span className="text-xs text-neutral-300">{item.label}</span>
                </label>
                <p className="mt-1 pl-6 text-[0.6rem] text-neutral-500">{item.description}</p>
                {item.symbolValue || item.id === "kbd-freq-snippet" ? (
                  <div className="mt-2 pl-6">
                    <button
                      type="button"
                      onClick={() => copySnippetForChecklist(item)}
                      className="rounded border border-neutral-600 px-2 py-0.5 text-[0.6rem] text-neutral-300 hover:border-emerald-500/40"
                    >
                      {item.id === "kbd-freq-snippet" ? "Copy frequency snippet" : "Copy"}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
