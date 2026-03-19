import type { Metadata } from "next";
import Link from "next/link";
import { AdminAgentsClient } from "./AdminAgentsClient";

export const metadata: Metadata = {
  title: "Agentes | Admin — WhatsApp Platform",
  description: "Gestão de disponibilidade dos agentes",
  robots: "noindex, nofollow",
};

export default function AdminAgentsPage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Gestão de agentes</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>
      <AdminAgentsClient />
    </div>
  );
}
