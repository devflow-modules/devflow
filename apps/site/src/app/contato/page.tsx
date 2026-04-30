import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contato | DevFlow Labs",
  description:
    "Entre em contato com a DevFlow Labs pelo WhatsApp ou email. Automação de atendimento no WhatsApp e produtos SaaS.",
  alternates: {
    canonical: "https://devflowlabs.com.br/contato",
  },
  openGraph: {
    title: "Contato | DevFlow Labs",
    description:
      "Entre em contato pelo WhatsApp ou email. Resposta rápida.",
    url: "https://devflowlabs.com.br/contato",
  },
};

export default function ContatoPage() {
  return (
    <main className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Contato
          </h1>
          <p className="mt-4 df-text-secondary">
            Resposta rápida. Entre em contato pelo WhatsApp ou email.
          </p>

          <div className="mt-12 space-y-8">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground">WhatsApp</h2>
              <p className="mt-2 text-sm df-text-secondary">
                Canal principal. Respondemos em poucos minutos em horário comercial.
              </p>
              <div className="mt-4">
                <WhatsAppCta
                  label="Falar no WhatsApp"
                  size="lg"
                  text="Olá, gostaria de falar com a equipe DevFlow Labs."
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground">E-mail</h2>
              <p className="mt-2 text-sm df-text-secondary">
                Para propostas formais ou dúvidas que exigem documentação.
              </p>
              <a
                href="mailto:contato@devflowlabs.com.br"
                className="mt-4 inline-block font-medium text-primary hover:underline"
              >
                contato@devflowlabs.com.br
              </a>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <p className="text-sm font-medium text-foreground">
                Resposta em até 24h (dias úteis).
              </p>
              <p className="mt-1 text-sm df-text-secondary">
                No WhatsApp, costumamos responder em minutos.
              </p>
            </div>
          </div>

          <p className="mt-12">
            <Link
              href="/"
              className="text-sm font-medium df-text-secondary hover:text-foreground"
            >
              ← Voltar ao início
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
