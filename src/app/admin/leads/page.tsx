import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AdminLeadsClient } from "./AdminLeadsClient";

export const metadata: Metadata = {
  title: "Leads outbound | Admin",
  description: "CRM mínimo para prospecção manual.",
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
