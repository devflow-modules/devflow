import type { ReactNode } from "react";
import { requireJwtAdminPage } from "@/lib/admin-page-guard";

/**
 * Lista e detalhe em `/admin/conversations` usam dados sensíveis e fluxo interno;
 * alinha com `ROUTE_META` (`platformOnly`) e evita acesso só com sessão válida.
 */
export default async function AdminConversationsLayout({ children }: { children: ReactNode }) {
  await requireJwtAdminPage("/admin/conversations");
  return children;
}
