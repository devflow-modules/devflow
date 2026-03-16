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
    "Automatize o atendimento do seu WhatsApp com IA, métricas e controle da operação. Ideal para negócios que recebem muitas mensagens.",
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
      "Automatize o atendimento do seu WhatsApp com IA, métricas e controle da operação. Ideal para negócios que recebem muitas mensagens.",
    images: [
      {
        url: `${baseUrl}/og-devflow.png`,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs Automação WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevFlow Labs | Automação WhatsApp",
    description:
      "Automatize o atendimento do seu WhatsApp com IA, métricas e controle da operação. Ideal para negócios que recebem muitas mensagens.",
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
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} font-sans flex min-h-screen flex-col antialiased`}
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
