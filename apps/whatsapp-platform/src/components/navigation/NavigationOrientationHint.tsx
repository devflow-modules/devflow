"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wp_nav_orientation_hint_dismissed_v1";

/**
 * Dica única e dispensável: menu, atalho de pesquisa e suporte — sem persistir estado no servidor.
 */
export function NavigationOrientationHint() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        setDismissed(false);
      }
    });
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  return (
    <div className="mb-6 flex flex-col gap-2 rounded-lg border border-slate-200/90 bg-white/90 px-3 py-2.5 text-xs leading-relaxed text-slate-600 shadow-sm ring-1 ring-slate-900/[0.04] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <p className="min-w-0">
        <span className="font-medium text-slate-800">Onde estou:</span> o menu à esquerda organiza o trabalho por
        área. Use{" "}
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] text-slate-700">
          Ctrl+K
        </kbd>{" "}
        ou{" "}
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] text-slate-700">
          ⌘K
        </kbd>{" "}
        para ir a qualquer página. O botão «Precisa de ajuda?» envia um pedido à equipa.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 self-end rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        Entendi
      </button>
    </div>
  );
}
