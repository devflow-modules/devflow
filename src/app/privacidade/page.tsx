import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade da DevFlow Labs. Informações sobre coleta, uso de dados, cookies, Meta Pixel e Vercel Analytics.",
};

export default function PrivacidadePage() {
  return (
    <main className="df-light py-16 sm:py-20">
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-8">
        <h1
          id="privacidade-heading"
          className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Política de Privacidade
        </h1>
        <p className="df-text-secondary mt-2 text-sm font-medium">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="df-card-light df-text-secondary mt-8 space-y-7 rounded-2xl p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="df-text-primary text-lg font-semibold">1. Responsável</h2>
            <p className="mt-2 text-sm leading-7">
              A DevFlow Labs é responsável pelo tratamento dos dados pessoais coletados neste site, em conformidade com a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">2. Dados que coletamos</h2>
            <p className="mt-2 text-sm leading-7">
              Podemos coletar dados de navegação (páginas visitadas, origem do tráfego, duração da visita), dados de contato quando você inicia conversa pelo WhatsApp, e informações técnicas (endereço IP, tipo de navegador).
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">3. Uso de cookies</h2>
            <p className="mt-2 text-sm leading-7">
              Utilizamos cookies e tecnologias similares para análise de uso do site, medição de desempenho de anúncios e melhoria da experiência. Consulte nossa{" "}
              <Link href="/cookies" className="df-link font-medium">
                Política de Cookies
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">4. Meta Pixel</h2>
            <p className="mt-2 text-sm leading-7">
              Usamos o Meta Pixel (Facebook/Instagram) para medir a eficácia de nossos anúncios e entender como os visitantes interagem com o site. O Meta pode usar esses dados para exibir anúncios relevantes em suas plataformas. Você pode gerenciar preferências de anúncios nas configurações da Meta.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">5. Vercel Analytics</h2>
            <p className="mt-2 text-sm leading-7">
              Utilizamos Vercel Analytics para métricas de página e visitantes. Os dados são processados de forma agregada e respeitam padrões de privacidade.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">6. WhatsApp</h2>
            <p className="mt-2 text-sm leading-7">
              Ao clicar em botões como &quot;Falar no WhatsApp&quot; ou &quot;Automatizar meu WhatsApp&quot;, você concorda em iniciar comunicação com a DevFlow Labs. As conversas serão tratadas conforme os termos do WhatsApp e desta política.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">7. Seus direitos</h2>
            <p className="mt-2 text-sm leading-7">
              Você tem direito a acessar, corrigir, excluir ou portar seus dados, e a revogar o consentimento. Entre em contato pelo WhatsApp ou por e-mail para exercer esses direitos.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">8. Contato</h2>
            <p className="mt-2 text-sm leading-7">
              Para dúvidas sobre privacidade, entre em contato via WhatsApp (link disponível no site) ou acesse a página de{" "}
              <Link href="/contato" className="df-link font-medium">
                Contato
              </Link>
              .
            </p>
          </section>
        </div>

        <p className="mt-12">
          <Link
            href="/"
            className="df-link text-sm font-semibold"
          >
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}
