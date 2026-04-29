import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Política de Cookies da DevFlow Labs. Uso de cookies, Meta Pixel e analytics no site.",
};

export default function CookiesPage() {
  return (
    <main className="df-light py-16 sm:py-20">
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-8">
        <h1
          id="cookies-heading"
          className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Política de Cookies
        </h1>
        <p className="df-text-secondary mt-2 text-sm font-medium">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="df-card-light df-text-secondary mt-8 space-y-7 rounded-2xl p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="df-text-primary text-lg font-semibold">O que são cookies</h2>
            <p className="mt-2 text-sm leading-7">
              Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles ajudam a recordar preferências, medir o uso do site e melhorar a experiência.
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">Como usamos cookies</h2>
            <p className="mt-2 text-sm leading-7">
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-7">
              <li>Medir visitas e páginaviews (Vercel Analytics)</li>
              <li>Medir eficácia de anúncios (Meta Pixel / Facebook)</li>
              <li>Entender a origem do tráfego e o comportamento de navegação</li>
            </ul>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">Meta Pixel</h2>
            <p className="mt-2 text-sm leading-7">
              O Meta Pixel (Facebook/Instagram) utiliza cookies para rastrear conversões, otimizar anúncios e criar públicos para campanhas. Os dados são processados pela Meta em conformidade com suas políticas. Você pode gerenciar preferências em{" "}
              <a
                href="https://www.facebook.com/settings?tab=ads"
                target="_blank"
                rel="noopener noreferrer"
                className="df-link font-medium"
              >
                Configurações de anúncios do Facebook
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="df-text-primary text-lg font-semibold">Gerenciar cookies</h2>
            <p className="mt-2 text-sm leading-7">
              Você pode desativar ou limitar cookies pelas configurações do seu navegador. Isso pode afetar a funcionalidade de partes do site. Para mais informações sobre privacidade, consulte nossa{" "}
              <Link href="/privacidade" className="df-link font-medium">
                Política de Privacidade
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
