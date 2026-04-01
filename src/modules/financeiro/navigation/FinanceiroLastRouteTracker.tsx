"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPersistableFinanceiroInternalPath } from "./lastRoute";

const DEBOUNCE_MS = 450;

export function FinanceiroLastRouteTracker() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!isPersistableFinanceiroInternalPath(pathname)) return;

    const id = window.setTimeout(() => {
      void fetch("/api/financeiro/navigation/last-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ path: pathname }),
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
