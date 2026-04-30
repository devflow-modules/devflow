import type { ReactNode } from "react";
import { requireJwtAdminPage } from "@/lib/admin-page-guard";

/** Garante `platform_admin` na UI de chat admin (página é Client Component). */
export default async function AdminConversationDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireJwtAdminPage(`/admin/conversations/${encodeURIComponent(id)}`);
  return <>{children}</>;
}
