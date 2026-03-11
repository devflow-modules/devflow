import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Política de Cookies da DevFlow Labs. Uso de cookies, Meta Pixel e analytics no site.",
};

export default function CookiesPage() {
  return (
    <main className="py-16 sm:py-20">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <h1
          id="cookies-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Política de Cookies
        </h1>
        <p className="mt-2 text-sm text-slate-600">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-foreground">O que são cookies</h2>
            <p className="mt-2 text-sm">
              Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles ajudam a recordar preferências, medir o uso do site e melhorar a experiência.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Como usamos cookies</h2>
            <p className="mt-2 text-sm">
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Medir visitas e páginaviews (Vercel Analytics)</li>
              <li>Medir eficácia de anúncios (Meta Pixel / Facebook)</li>
              <li>Entender a origem do tráfego e o comportamento de navegação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Meta Pixel</h2>
            <p className="mt-2 text-sm">
              O Meta Pixel (Facebook/Instagram) utiliza cookies para rastrear conversões, otimizar anúncios e criar públicos para campanhas. Os dados são processados pela Meta em conformidade com suas políticas. Você pode gerenciar preferências em{" "}
              <a
                href="https://www.facebook.com/settings?tab=ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                Configurações de anúncios do Facebook
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Gerenciar cookies</h2>
            <p className="mt-2 text-sm">
              Você pode desativar ou limitar cookies pelas configurações do seu navegador. Isso pode afetar a funcionalidade de partes do site. Para mais informações sobre privacidade, consulte nossa{" "}
              <Link href="/privacidade" className="text-primary underline hover:no-underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>
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
