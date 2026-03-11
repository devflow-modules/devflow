import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingWhatsAppCta } from "@/components/shared/floating-whatsapp-cta";
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
    "DevFlow Labs — automação de atendimento no WhatsApp com métricas, handoff e controle da operação. Produtos SaaS e soluções digitais.",
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
      "Automação de atendimento no WhatsApp com métricas, handoff e controle da operação. Produtos SaaS e soluções digitais.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevFlow Labs | Automação de Atendimento no WhatsApp",
    description:
      "Automação de atendimento no WhatsApp com métricas, handoff e controle da operação. Produtos SaaS e soluções digitais.",
  },
  robots: {
    index: true,
    follow: true,
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
        <MetaPixel />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingWhatsAppCta />
      </body>
    </html>
  );
}
