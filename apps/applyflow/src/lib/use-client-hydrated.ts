import { useSyncExternalStore } from "react";

function subscribeClientHydration(): () => void {
  return () => undefined;
}

function getClientHydrationSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

/**
 * False during SSR and the client's hydration render so localStorage is not
 * read until React has matched the server markup.
 */
export function useClientHydrated(): boolean {
  return useSyncExternalStore(
    subscribeClientHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
}
