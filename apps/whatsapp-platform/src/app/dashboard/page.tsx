import { getTenantSnapshot } from "@/lib/tenant-session";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const snapshot = await getTenantSnapshot();
  return <DashboardClient snapshot={snapshot} />;
}
