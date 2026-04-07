import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

export default function QueuesLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
