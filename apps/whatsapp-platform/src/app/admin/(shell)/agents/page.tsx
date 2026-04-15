import type { Metadata } from "next";
import Link from "next/link";
import { requireJwtAdminPage } from "@/lib/admin-page-guard";
import { AdminAgentsClient } from "./AdminAgentsClient";

export const metadata: Metadata = {
  title: "Agentes | Admin — WhatsApp Platform",
  description: "Gestão de disponibilidade dos agentes",
  robots: "noindex, nofollow",
};

export default async function AdminAgentsPage() {
  await requireJwtAdminPage("/admin/agents");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Gestão de agentes</h1>
      <Link href="/dashboard" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">
        Voltar ao Dashboard
      </Link>
      <AdminAgentsClient />
    </div>
  );
}
