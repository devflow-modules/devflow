"use client";

import { useEffect, useState } from "react";

/**
 * `matchMedia` para um breakpoint mínimo (alinhado a Tailwind, ex.: 768 = md, 1024 = lg, 1280 = xl).
 * `initialMatch` evita layout “errado” no primeiro paint antes do efeito (igual filosofia ao `useMediaMd`).
 */
export function useMediaMinWidth(breakpointPx: number, initialMatch = true): boolean {
  const [match, setMatch] = useState(initialMatch);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const apply = () => setMatch(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpointPx]);
  return match;
}
