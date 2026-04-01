"use client";

import { useEffect, useState } from "react";

/** Re-render quando rotas recentes ou última ação mudam (localStorage + tracker). */
export function useOperationalRefresh(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const fn = () => setV((x) => x + 1);
    window.addEventListener("financeiro-operational-refresh", fn);
    return () => window.removeEventListener("financeiro-operational-refresh", fn);
  }, []);
  return v;
}
