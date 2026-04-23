import type { Metadata } from "next";
import { LeadFinderClient } from "./LeadFinderClient";

export const metadata: Metadata = {
  title: "Lead Finder | Admin",
  description: "Atalho para busca no Maps e cadastro rápido de leads.",
  robots: "noindex, nofollow",
};

export default function AdminLeadFinderPage() {
  return (
    <div className="min-h-screen bg-background">
      <LeadFinderClient />
    </div>
  );
}
