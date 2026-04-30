import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { AdminDevFlowBanner } from "@/components/admin/AdminDevFlowBanner";

/** Shell tenant + faixa exclusiva `/admin/*` (acesso apenas `platform_admin`). */
export default function AdminShellLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <AdminDevFlowBanner />
      {children}
    </AppShell>
  );
}
