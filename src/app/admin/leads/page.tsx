import type { Metadata } from "next";
import { AdminLeadsClient } from "./AdminLeadsClient";

export const metadata: Metadata = {
  title: "Leads outbound | Admin",
  description: "CRM mínimo para prospecção manual.",
  robots: "noindex, nofollow",
};

export default function AdminLeadsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminLeadsClient />
    </div>
  );
}
