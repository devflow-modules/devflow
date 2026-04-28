import Link from "next/link";
import { MessageCircle, Wallet, Sparkles, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const products = [
  {
    icon: MessageCircle,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    tag: "Produto",
    tagColor: "text-primary",
    title: "WhatsApp Platform",
    subtitle: "Automação de Atendimento",
    description:
      "Resposta na hora, 24h. Gente entra só quando o cliente pede.",
    highlights: [
      "Automação 24/7 com IA",
      "Handoff para equipe humana",
      "Métricas operacionais",
      "WhatsApp Cloud API oficial",
    ],
    cta: "Começar agora (leva menos de 1 min)",
    href: "/produtos/whatsapp-platform",
    external: false,
    accent: "border-primary/30",
  },
  {
    icon: Wallet,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    tag: "SaaS",
    tagColor: "text-blue-500",
    title: "Sistema Financeiro",
    subtitle: "Gestão Financeira Completa",
    description:
      "Receitas, despesas, mês fechado — PF, PJ ou casal. Num lugar só.",
    highlights: [
      "Múltiplos contextos",
      "Recorrência automática",
      "Fechamento mensal",
      "Importação CSV",
    ],
    cta: "Testar grátis — sem cartão",
    href: "/ferramentas/financeiro",
    external: false,
    accent: "border-blue-500/30",
  },
  {
    icon: Sparkles,
    iconBg: "bg-muted/40",
    iconColor: "text-muted-foreground",
    tag: "Em breve",
    tagColor: "text-muted-foreground",
    title: "Próximo produto",
    subtitle: "Em desenvolvimento",
    description:
      "Novos produtos e ferramentas chegando em breve para completar o ecossistema DevFlow Labs.",
    highlights: [
      "Acompanhe o lançamento",
      "Notificação por e-mail",
      "Acesso antecipado",
    ],
    cta: "Quero saber",
    href: "/contato",
    external: false,
    accent: "border-dashed border-border",
    disabled: true,
  },
];

export function ProductsSection() {
  return (
    <section
      id="produtos"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-24 sm:py-28"
      aria-labelledby="products-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="products-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Quando ferramenta grátis não basta mais
          </h2>
          <p className="df-text-secondary mt-3 leading-relaxed">
            Quando precisa de mais que ferramenta avulsa.
          </p>
          <p className="mt-4 text-sm font-medium text-primary/90">
            Agora que você viu o rápido, veja o que escala.
          </p>
          <p className="df-text-secondary mx-auto mt-6 max-w-lg text-sm leading-relaxed">
            Teste sem risco — não fez sentido, você não usa.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.title}
              className={cn(
                "flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm",
                "transition-all duration-300",
                product.disabled
                  ? "opacity-70"
                  : "hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_16px_48px_rgba(15,23,42,0.1)]",
                product.accent
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("flex size-10 items-center justify-center rounded-xl", product.iconBg)}>
                  <product.icon className={cn("size-5", product.iconColor)} aria-hidden />
                </div>
                <div>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", product.tagColor)}>
                    {product.tag}
                  </p>
                </div>
              </div>

              <h3 className="df-text-primary mt-4 text-lg font-semibold">{product.title}</h3>
              <p className="df-text-secondary text-sm font-medium">{product.subtitle}</p>
              <p className="df-text-secondary mt-2 flex-1 text-sm leading-relaxed">{product.description}</p>

              <ul className="mt-4 space-y-1.5">
                {product.highlights.map((item) => (
                  <li key={item} className="df-text-secondary flex items-center gap-2 text-xs leading-relaxed">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href={product.href}
                className={cn(
                  "mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                  "transition-all duration-200",
                  product.disabled
                    ? "df-text-secondary cursor-default border border-dashed border-border bg-muted/20 opacity-60 pointer-events-none"
                    : "df-surface-elevated border border-border text-foreground hover:bg-muted/20"
                )}
                tabIndex={product.disabled ? -1 : undefined}
                aria-disabled={product.disabled}
              >
                {product.cta}
                {product.external ? (
                  <ExternalLink className="size-4" aria-hidden />
                ) : (
                  <ArrowRight className="size-4" aria-hidden />
                )}
              </Link>
            </article>
          ))}
        </div>
        <p className="df-text-muted mx-auto mt-10 max-w-md text-center text-xs leading-relaxed">
          Onde for grátis: sem cartão. Pode parar quando quiser.
        </p>
      </div>
    </section>
  );
}
