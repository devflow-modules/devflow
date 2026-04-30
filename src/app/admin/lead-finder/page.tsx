import type { Metadata } from "next";
import { LeadFinderClient } from "./LeadFinderClient";

export const metadata: Metadata = {
  title: "Prospecção DevFlow | Lead Finder",
  description: "Ferramenta interna — Maps e cadastro rápido de leads (ligação ao Inbox via conversation ref).",
  robots: "noindex, nofollow",
};

export default function AdminLeadFinderPage() {
  return (
    <div className="min-h-screen bg-background">
      <LeadFinderClient />
    </div>
  );
}
