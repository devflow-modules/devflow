"use client";

import { useEffect, useRef } from "react";
import { trackCtaScroll50, trackScrollDepth } from "@/lib/analytics";

const MILESTONES = [25, 50, 75] as const;

/**
 * Dispara eventos de profundidade de scroll (25%, 50%, 75%) na home.
 */
export function ScrollTracker() {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent =
        scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;

      for (const pct of MILESTONES) {
        if (fired.current.has(pct)) continue;
        if (scrollPercent >= pct - 2) {
          fired.current.add(pct);
          if (pct === 50) trackCtaScroll50();
          trackScrollDepth(pct);
        }
      }

      if (fired.current.size === MILESTONES.length) {
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return null;
}
