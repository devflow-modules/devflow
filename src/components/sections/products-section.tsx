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
      "Cliente manda mensagem e recebe resposta na hora — 24h. Quando precisar de gente, passa pra sua equipe sem o cliente repetir tudo.",
    highlights: [
      "Automação 24/7 com IA",
      "Handoff para equipe humana",
      "Métricas operacionais",
      "WhatsApp Cloud API oficial",
    ],
    cta: "Começar agora",
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
      "Chega de planilha espalhada. Receitas, despesas, orçamento e fechamento do mês num lugar só — PF, PJ ou casal.",
    highlights: [
      "Múltiplos contextos",
      "Recorrência automática",
      "Fechamento mensal",
      "Importação CSV",
    ],
    cta: "Testar grátis",
    href: "/ferramentas/financeiro",
    external: false,
    accent: "border-blue-500/30",
  },
  {
    icon: Sparkles,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-400",
    tag: "Em breve",
    tagColor: "text-slate-400",
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
    accent: "border-dashed border-slate-200",
    disabled: true,
  },
];

export function ProductsSection() {
  return (
    <section
      id="produtos"
      className="py-24 bg-[#f8fafc]"
      aria-labelledby="products-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="products-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Quando ferramenta grátis não basta mais
          </h2>
          <p className="mt-3 text-slate-600">
            Sistemas prontos pra operação que não para. Testar grátis onde der.
          </p>
          <p className="mx-auto mt-5 max-w-xl rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-foreground">
            Teste sem risco — se não fizer sentido, você não usa.
          </p>
        </div>

        {/* Grid de produtos */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

              <h3 className="mt-4 text-lg font-semibold text-foreground">{product.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{product.subtitle}</p>
              <p className="mt-2 flex-1 text-sm text-slate-600">{product.description}</p>

              <ul className="mt-4 space-y-1.5">
                {product.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-slate-500">
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
                    ? "border border-dashed border-slate-300 bg-slate-50 text-slate-400 cursor-default pointer-events-none"
                    : "border border-border bg-white text-foreground hover:bg-slate-50"
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
              {!product.disabled && (
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  Sem cartão onde for grátis · Sem compromisso · Pode parar quando quiser
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
