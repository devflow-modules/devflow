import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

/** `QueryProvider` está dentro de `AppShell` (rotas como /queues também precisam de React Query). */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
