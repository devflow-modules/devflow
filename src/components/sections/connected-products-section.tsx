import Link from "next/link";
import { Wallet, Building2, SplitSquareHorizontal, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const connections = [
  {
    tools: [{ icon: Wallet, label: "Financeiro" }],
    product: { label: "WhatsApp Platform", href: "/produtos/whatsapp-platform" },
    description: "Controle suas finanças e automatize o atendimento no mesmo ecossistema.",
  },
  {
    tools: [{ icon: Building2, label: "Consulta CNPJ" }],
    product: { label: "Automações", href: "/automacao-whatsapp" },
    description: "Consulte dados de empresas e use em fluxos de automação e qualificação.",
  },
  {
    tools: [{ icon: SplitSquareHorizontal, label: "Divisão de contas" }, { icon: Wallet, label: "Financeiro" }],
    product: { label: "Financeiro", href: "/ferramentas/financeiro" },
    description: "Divida contas no dia a dia e consolide tudo no sistema financeiro.",
  },
];

export function ConnectedProductsSection() {
  return (
    <section
      id="conectado-produtos"
      className="df-light py-24"
      aria-labelledby="connected-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2 id="connected-heading" className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl">
            Conectado com nossos produtos
          </h2>
          <p className="df-text-secondary mt-3">
            As ferramentas se integram ao ecossistema. Use sozinhas ou junto com os produtos.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {connections.map((conn, i) => (
            <Link
              key={i}
              href={conn.product.href}
              className={cn(
                "df-card-light block rounded-2xl border p-6",
                "transition-all duration-200 hover:border-primary/30 hover:shadow-lg"
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {conn.tools.map((t) => (
                    <span
                      key={t.label}
                      className="df-text-primary inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-medium"
                    >
                      <t.icon className="size-4 text-primary" aria-hidden />
                      {t.label}
                    </span>
                  ))}
                  <span className="df-text-muted" aria-hidden>+</span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                    {conn.product.label}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary shrink-0">
                  Ver
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </div>
              <p className="df-text-secondary mt-3 text-sm">{conn.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
