"use client";

import { useSyncExternalStore } from "react";

const MD_QUERY = "(min-width: 768px)";

function readMdUp(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia(MD_QUERY).matches;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const media = window.matchMedia(MD_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return readMdUp();
}

/** SSR/default: desktop (table). Client: follow viewport. */
function getServerSnapshot(): boolean {
  return true;
}

/** True at Tailwind `md` and up — Applications table vs mobile cards. */
export function useMdUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
