import type { Metadata, Viewport } from "next";

import { ApplyFlowSiteHeader } from "@/components/ui/ApplyFlowSiteHeader";
import { getAuthenticatedApplyFlowUser } from "@/lib/persistence-v2/auth/get-authenticated-user";

import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_APPLYFLOW_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3010");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ApplyFlow — Local-first career workflow (DevFlow Labs)",
  description:
    "Discover jobs, evaluate fit with a deterministic Match Engine, prioritize opportunities, prepare applications, and track lifecycle — local-first with optional V2 cloud persistence.",
  openGraph: {
    title: "ApplyFlow — DevFlow Labs",
    description:
      "Local-first career workflow: discovery, match preview, opportunity queue, readiness, and application lifecycle tracking. No auto-apply.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ApplyFlow — DevFlow Labs",
    description: "Local-first career workflow for discovering, evaluating, and tracking job opportunities.",
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
