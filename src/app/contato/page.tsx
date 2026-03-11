import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Entre em contato com a DevFlow Labs pelo WhatsApp. Automação de atendimento no WhatsApp e produtos SaaS.",
  openGraph: {
    title: "Contato | DevFlow Labs",
    description:
      "Entre em contato com a DevFlow Labs pelo WhatsApp. Automação e produtos SaaS.",
    url: "https://devflowlabs.com.br/contato",
  },
  twitter: {
    title: "Contato | DevFlow Labs",
    description: "Entre em contato com a DevFlow Labs pelo WhatsApp.",
  },
};

export default function ContatoPage() {
  return (
    <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 sm:p-12">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Contato
        </h1>
        <p className="mt-4 text-muted-foreground">
          Entre em contato pelo WhatsApp para conversarmos.
        </p>
        <div className="mt-6">
          <WhatsAppCta label="Falar no WhatsApp" size="lg" />
        </div>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          ← Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
