import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AdminLeadsClient } from "./AdminLeadsClient";

export const metadata: Metadata = {
  title: "Prospecção DevFlow | Leads",
  description: "Ferramenta interna DevFlow — prospecção outbound; não é CRM do produto para clientes.",
  robots: "noindex, nofollow",
};

export default function AdminLeadsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors closeButton />
      <AdminLeadsClient />
    </div>
  );
}
