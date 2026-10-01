import type { Metadata, Viewport } from "next";

import { ApplyFlowSiteHeader } from "@/components/ui/ApplyFlowSiteHeader";
import { getAuthenticatedApplyFlowUser } from "@/lib/persistence-v2/auth/get-authenticated-user";

import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_APPLYFLOW_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3010");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ApplyFlow — fluxo de carreira (DevFlow Labs)",
  description:
    "Descobre vagas, avalia fit com Match determinístico, prioriza oportunidades, prepara candidaturas e acompanha o lifecycle — local no browser, com sync opcional. Sem auto-envio.",
  openGraph: {
    title: "ApplyFlow — DevFlow Labs",
    description:
      "Fluxo de carreira: discovery, Match, fila de oportunidades, readiness e lifecycle. Sem auto-apply.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ApplyFlow — DevFlow Labs",
    description: "Organiza a busca por vagas do descobrimento ao acompanhamento — sem auto-envio.",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
};

async function resolveSignedIn(): Promise<boolean> {
  try {
    await getAuthenticatedApplyFlowUser();
    return true;
  } catch {
    return false;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await resolveSignedIn();

  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans">
        <ApplyFlowSiteHeader signedIn={signedIn} />
        {children}
      </body>
    </html>
  );
}
