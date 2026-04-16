"use client";

import { useMediaMinWidth } from "@/lib/useMediaMinWidth";

/**
 * Breakpoint md (Tailwind 768px).
 * Valor inicial `true` evita o primeiro paint com layout “mobile” no SSR/cliente antes de existir `window`,
 * que escondia a coluna do chat em desktop (`showChatColumn` dependia de `isMd`).
 * Após `useEffect`, alinha com `matchMedia`.
 */
export function useMediaMd(): boolean {
  return useMediaMinWidth(768, true);
}
