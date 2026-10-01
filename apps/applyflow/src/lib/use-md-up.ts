"use client";

import { useSyncExternalStore } from "react";

const MD_QUERY = "(min-width: 768px)";

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(MD_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(MD_QUERY).matches;
}

/** SSR/default: desktop (table). Client: follow viewport. */
function getServerSnapshot(): boolean {
  return true;
}

/** True at Tailwind `md` and up — Applications table vs mobile cards. */
export function useMdUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
