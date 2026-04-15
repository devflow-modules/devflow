"use client";

import { useEffect, useState } from "react";

/**
 * Breakpoint md (Tailwind 768px).
 * Valor inicial `true` evita o primeiro paint com layout “mobile” no SSR/cliente antes de existir `window`,
 * que escondia a coluna do chat em desktop (`showChatColumn` dependia de `isMd`).
 * Após `useEffect`, alinha com `matchMedia`.
 */
export function useMediaMd(): boolean {
  const [md, setMd] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMd(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return md;
}
