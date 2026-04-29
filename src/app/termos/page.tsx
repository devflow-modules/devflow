import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso dos serviços e plataformas da DevFlow Labs. Condições de uso, responsabilidades e limitações.",
};

export default function TermosPage() {
  return (
    <main className="df-light py-16 sm:py-20">
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-8">
        <h1
          id="termos-heading"
          className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Termos de Uso
        </h1>
        <p className="df-text-secondary mt-2 text-sm font-medium">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="df-card-light df-text-secondary mt-8 space-y-7 rounded-2xl p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="df-text-primary text-lg font-semibold">1. Aceitação</h2>
            <p className="mt-2 text-sm leading-7">
              Ao acessar e usar o site devflowlabs.com.br e os serviços da DevFlow Labs, você concorda com estes Termos de Uso. Se não concordar, não utilize o site ou os serviços.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">2. Serviços</h2>
            <p className="mt-2 text-sm leading-7">
              A DevFlow Labs oferece automação de atendimento no WhatsApp, plataformas SaaS e soluções de software. Os serviços específicos e condições comerciais são definidos em contrato ou proposta quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">3. Uso adequado</h2>
            <p className="mt-2 text-sm leading-7">
              O usuário se compromete a utilizar o site e os serviços de forma lícita, respeitando a legislação brasileira, as políticas do WhatsApp e boas práticas. É vedado o uso para atividades ilegais, spam ou abuso.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">4. Propriedade intelectual</h2>
            <p className="mt-2 text-sm leading-7">
              O conteúdo do site, marcas, logos e plataformas são de propriedade da DevFlow Labs. A reprodução não autorizada é proibida.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">5. Limitação de responsabilidade</h2>
            <p className="mt-2 text-sm leading-7">
              O site é fornecido &quot;como está&quot;. A DevFlow Labs não se responsabiliza por danos indiretos decorrentes do uso do site. Para serviços contratados, as condições específicas do contrato prevalecem.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">6. Alterações</h2>
            <p className="mt-2 text-sm leading-7">
              A DevFlow Labs pode alterar estes termos a qualquer momento. A continuação do uso após alterações constitui aceitação. Recomendamos consultar esta página periodicamente.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">7. Contato</h2>
            <p className="mt-2 text-sm leading-7">
              Para dúvidas sobre estes termos, acesse a página de{" "}
              <Link href="/contato" className="df-link font-medium">
                Contato
              </Link>
              .
            </p>
          </section>
        </div>

        <p className="mt-12">
          <Link href="/" className="df-link text-sm font-semibold">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}
