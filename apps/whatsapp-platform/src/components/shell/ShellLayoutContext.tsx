"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "df-shell-sidebar-collapsed";

type ShellLayoutValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
};

const ShellLayoutContext = createContext<ShellLayoutValue | null>(null);

export function ShellLayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setSidebarCollapsedState(localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        /* ignore */
      }
      setHydrated(true);
    });
  }, []);

  const persistCollapsed = useCallback((v: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setSidebarCollapsed = useCallback(
    (v: boolean) => {
      setSidebarCollapsedState(v);
      persistCollapsed(v);
    },
    [persistCollapsed]
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      persistCollapsed(next);
      return next;
    });
  }, [persistCollapsed]);

  const value = useMemo(
    () => ({
      sidebarCollapsed: hydrated ? sidebarCollapsed : false,
      toggleSidebar,
      setSidebarCollapsed,
    }),
    [hydrated, sidebarCollapsed, toggleSidebar, setSidebarCollapsed]
  );

  return <ShellLayoutContext.Provider value={value}>{children}</ShellLayoutContext.Provider>;
}

export function useShellLayout(): ShellLayoutValue {
  const ctx = useContext(ShellLayoutContext);
  if (!ctx) {
    throw new Error("useShellLayout must be used within ShellLayoutProvider");
  }
  return ctx;
}

/** Versão segura quando o provider não envolve (testes / story). */
export function useShellLayoutOptional(): ShellLayoutValue | null {
  return useContext(ShellLayoutContext);
}
