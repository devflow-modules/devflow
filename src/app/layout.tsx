import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BodyChrome } from "@/components/layout/body-chrome";
import { Analytics } from "@vercel/analytics/next";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "DevFlow Labs | Automação de Atendimento no WhatsApp",
    template: "%s | DevFlow Labs",
  },
  description:
    "WhatsApp Platform, inbox e automação para atendimento e vendas — com ferramentas e produtos DevFlow Labs. Menos caos, mais resposta e controle da operação.",
  keywords: [
    "automação",
    "WhatsApp",
    "atendimento",
    "SaaS",
    "DevFlow Labs",
    "handoff",
    "chatbot",
  ],
  authors: [{ name: "DevFlow Labs", url: baseUrl }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: baseUrl,
    siteName: "DevFlow Labs",
    title: "DevFlow Labs | Automação de Atendimento no WhatsApp",
    description:
      "WhatsApp Platform, inbox e automação para atendimento e vendas — com ferramentas e produtos DevFlow Labs.",
    images: [
      {
        url: `${baseUrl}/og-devflow.png`,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — WhatsApp Platform, inbox e automação",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevFlow Labs | Automação WhatsApp",
    description:
      "WhatsApp Platform, inbox e automação para atendimento e vendas — com ferramentas e produtos DevFlow Labs.",
    images: [`${baseUrl}/og-devflow.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "facebook-domain-verification": "f1d1q94bkf8laftdmk6yh0i0qnpnz4",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DevFlow Labs",
  url: baseUrl,
  logo: `${baseUrl}/og-devflow.png`,
  sameAs: ["https://github.com/gustavomarques00/devflow"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: "Portuguese",
    areaServed: "BR",
    url: `${baseUrl}/contato`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeMode = process.env.NEXT_PUBLIC_THEME_MODE === "client_branded" ? "client_branded" : "devflow";
  return (
    <html lang="pt-BR" data-theme={themeMode}>
      <body
        className={`${inter.variable} df-page font-sans flex min-h-screen flex-col antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <MetaPixel />
        <BodyChrome>{children}</BodyChrome>
        <Analytics />
      </body>
    </html>
  );
}
