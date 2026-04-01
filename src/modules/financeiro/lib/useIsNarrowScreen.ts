"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getNarrowSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * true em viewports ≤767px (mobile / narrow). Inicial false no servidor para evitar mismatch SSR.
 */
export function useIsNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, getNarrowSnapshot, () => false);
}
