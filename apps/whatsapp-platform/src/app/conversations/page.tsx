import { redirect } from "next/navigation";

/**
 * Rota legada: lista Supabase `conversations` foi substituída pela Inbox canónica (Prisma).
 * @see docs/architecture/LEGACY-CLEANUP.md
 */
export default function ConversationsPage() {
  redirect("/inbox");
}
