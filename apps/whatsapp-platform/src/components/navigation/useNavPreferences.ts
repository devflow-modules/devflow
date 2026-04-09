"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wp_nav_prefs_v1";

export type NavPrefs = {
  /** ids de secções colapsadas na sidebar */
  collapsedSections: Record<string, boolean>;
};

const defaultPrefs: NavPrefs = {
  collapsedSections: {},
};

function load(): NavPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<NavPrefs>;
    return {
      collapsedSections:
        parsed.collapsedSections && typeof parsed.collapsedSections === "object"
          ? parsed.collapsedSections
          : {},
    };
  } catch {
    return defaultPrefs;
  }
}

export function useNavPreferences() {
  const [prefs, setPrefs] = useState<NavPrefs>(defaultPrefs);

  useEffect(() => {
    // Preferências em localStorage só existem no cliente; após montagem evita mismatch de hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync inicial do store local (único mount)
    setPrefs(load());
  }, []);

  const setSectionCollapsed = useCallback((sectionId: string, collapsed: boolean) => {
    setPrefs((prev) => {
      const next: NavPrefs = {
        ...prev,
        collapsedSections: { ...prev.collapsedSections, [sectionId]: collapsed },
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, []);

  return { prefs, setSectionCollapsed };
}
