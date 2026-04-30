import type { ReactNode } from "react";
import { requireDevflowOutboundCrmPage } from "@/lib/admin-leads-page-guard";

export default async function AdminLeadFinderLayout({ children }: { children: ReactNode }) {
  await requireDevflowOutboundCrmPage("/admin/lead-finder");
  return <>{children}</>;
}
