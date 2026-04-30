import { cn } from "@/lib/utils";

export type FaqItem = { q: string; a: string };

type Props = {
  items: FaqItem[];
  title?: string;
  id?: string;
  className?: string;
  /** Base URL para o JSON-LD (ex: https://devflowlabs.com.br) */
  baseUrl?: string;
  /** URL da página atual para o Article/FAQ schema */
  pageUrl?: string;
  /** Se true, renderiza script JSON-LD FAQPage */
  withSchema?: boolean;
};

/** Gera 3 FAQs mínimos a partir de título e intro quando a página não tem faq. */
export function getDefaultFaqFromContent(h1: string, intro: string): FaqItem[] {
  const theme = h1.length > 40 ? h1.slice(0, 40) + "…" : h1;
  return [
    {
      q: `Quando faz sentido usar ${theme.toLowerCase()}?`,
      a: intro.slice(0, 200).trim() + (intro.length > 200 ? "…" : ""),
    },
    {
      q: "Preciso pagar ou me cadastrar?",
      a: "Nas ferramentas DevFlow Labs você não precisa cadastrar cartão. O uso é gratuito e pode ser feito direto no navegador.",
    },
    {
      q: "Onde encontro mais guias sobre esse tema?",
      a: "No hub de ferramentas da DevFlow Labs há outros guias e a calculadora para usar na prática. Acesse o link «Ferramentas» no menu.",
    },
  ];
}

export function FaqSection({
  items,
  title = "Perguntas frequentes",
  id = "faq",
  className,
  baseUrl = "https://devflowlabs.com.br",
  pageUrl = "",
  withSchema = true,
}: Props) {
  if (items.length === 0) return null;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const fullUrl = pageUrl ? (pageUrl.startsWith("http") ? pageUrl : `${baseUrl}${pageUrl}`) : baseUrl;

  return (
    <section
      id={id}
      className={cn("border-t border-border bg-card py-12 sm:py-14", className)}
      aria-labelledby={`${id}-heading`}
    >
      {withSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <h2
          id={`${id}-heading`}
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {title}
        </h2>
        <dl className="mt-6 space-y-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-muted/60/60 p-4 sm:p-5"
            >
              <dt className="font-medium text-foreground">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed df-text-secondary sm:text-base">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
