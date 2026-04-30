import type { ReactNode } from "react";
import { requireDevflowOutboundCrmPage } from "@/lib/admin-leads-page-guard";

export default async function AdminLeadsLayout({ children }: { children: ReactNode }) {
  await requireDevflowOutboundCrmPage("/admin/leads");
  return <>{children}</>;
}
