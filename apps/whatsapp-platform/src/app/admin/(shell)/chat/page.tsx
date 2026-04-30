import { redirect } from "next/navigation";
import { requireJwtAdminPage } from "@/lib/admin-page-guard";

/**
 * Compat: links antigos usavam `?conversationId=`. A rota canónica é `/admin/conversations/[id]`.
 */
export default async function AdminChatRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  await requireJwtAdminPage("/admin/chat");
  const { conversationId } = await searchParams;
  const id = conversationId?.trim();
  if (id) {
    redirect(`/admin/conversations/${encodeURIComponent(id)}`);
  }
  redirect("/admin/conversations");
}
