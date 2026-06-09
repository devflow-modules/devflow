import type { Metadata } from "next";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

const demoTitle = "Demo WhatsApp Platform | DevFlow Labs";
const demoDescription =
  "Veja na prática como a DevFlow organiza atendimento e vendas no WhatsApp com IA, handoff humano, fila, SLA e dashboard operacional.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: demoTitle,
  description: demoDescription,
  alternates: {
    canonical: `${baseUrl}/demo`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: demoTitle,
    description: demoDescription,
    url: `${baseUrl}/demo`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — demo da WhatsApp Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: demoTitle,
    description: demoDescription,
    images: [ogImage],
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
