import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Sobre a DevFlow Labs. Software Engineering, automação e plataformas de atendimento no WhatsApp.",
};

export default function SobrePage() {
  return (
    <main className="py-16 sm:py-20">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <h1
          id="sobre-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Sobre a DevFlow Labs
        </h1>

        <div className="mt-8 space-y-6 text-slate-700">
          <p className="text-sm">
            A DevFlow Labs desenvolve software para automação, operação e produtos digitais. Nosso foco é construir plataformas que escalam atendimento, automatizam processos e entregam resultados mensuráveis.
          </p>
          <p className="text-sm">
            Criamos automação de atendimento no WhatsApp com IA, handoff humano, métricas operacionais e controle real da operação — não apenas chatbots, mas infraestrutura de atendimento.
          </p>
          <p className="text-sm">
            Também desenvolvemos produtos SaaS próprios, como o FunkLab Studio e ferramentas de produtividade, sempre com foco em engenharia de software e experiência do usuário.
          </p>
          <p className="text-sm">
            Se você busca automatizar atendimento, escalar operação ou construir um produto digital, podemos conversar.
          </p>
        </div>

        <div className="mt-10">
          <WhatsAppCta label="Falar no WhatsApp" size="lg" />
        </div>

        <p className="mt-12">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}
