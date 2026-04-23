import { redirect } from "next/navigation";

/**
 * Compat: links antigos usavam `?conversationId=`. A rota canónica é `/admin/conversations/[id]`.
 */
export default async function AdminChatRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { conversationId } = await searchParams;
  const id = conversationId?.trim();
  if (id) {
    redirect(`/admin/conversations/${encodeURIComponent(id)}`);
  }
  redirect("/admin/conversations");
}
