"use client";

import { useCallback, useState } from "react";

/**
 * Toast mínimo (sem dependências). Renderize {anchor} no layout do componente.
 */
export function useSimpleToast(durationMs = 2600) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback(
    (message: string) => {
      setToast(message);
      window.setTimeout(() => setToast(null), durationMs);
    },
    [durationMs]
  );

  const anchor =
    toast !== null ? (
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[200] max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-xl border border-slate-200/90 bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
      >
        {toast}
      </div>
    ) : null;

  return { showToast, toastAnchor: anchor };
}
