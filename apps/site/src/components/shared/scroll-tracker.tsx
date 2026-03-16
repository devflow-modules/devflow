"use client";

import { useEffect, useRef } from "react";
import { trackCtaScroll50 } from "@/lib/analytics";

/**
 * Dispara cta_scroll_50 quando o usuário rola 50% da página.
 * Usado na home para medir engajamento.
 */
export function ScrollTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;

      if (scrollPercent >= 50) {
        fired.current = true;
        trackCtaScroll50();
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return null;
}
