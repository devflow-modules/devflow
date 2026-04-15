import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

/** Mesmo shell que o resto da app: sidebar fixa + scroll só na área de conteúdo (`ShellPage`). */
export default function AdminShellLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
