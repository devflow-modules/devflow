import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const toolsLinks = [
  { href: "/ferramentas", label: "Hub de ferramentas" },
  { href: "/ferramentas/financeiro", label: "Financeiro" },
  { href: "/ferramentas/divisao-de-contas", label: "Divisão de contas" },
  { href: "/ferramentas/consulta-cnpj", label: "Consulta CNPJ" },
];

const productsLinks = [
  { href: "/produtos", label: "Todos os produtos" },
  { href: "/produtos/whatsapp-platform", label: "WhatsApp Platform" },
  { href: "/ferramentas/financeiro", label: "Sistema Financeiro" },
];

const automacaoLinks = [
  { href: "/automacao-whatsapp", label: "Automação WhatsApp" },
  { href: "/automacao-whatsapp-tabacaria", label: "Tabacarias" },
  { href: "/automacao-whatsapp-restaurante", label: "Restaurantes" },
  { href: "/automacao-whatsapp-loja", label: "Lojas" },
  { href: "/automacao-whatsapp-clinica", label: "Clínicas" },
  { href: "/demo", label: "Demo" },
  { href: "/precos", label: "Preços" },
];

const empresaLinks = [
  { href: "/sobre", label: "Sobre" },
  { href: "/projetos", label: "Projetos" },
  { href: "/blog", label: "Blog" },
  { href: "/contato", label: "Contato" },
];

const legalLinks = [
  { href: "/privacidade", label: "Política de Privacidade" },
  { href: "/termos", label: "Termos de Uso" },
  { href: "/cookies", label: "Cookies" },
];

const currentYear = new Date().getFullYear();

const footerLinkClass =
  "flex min-h-10 items-center py-1 text-sm text-muted-foreground transition-colors hover:text-primary";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1200px] px-3 py-10 min-[400px]:px-4 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-block text-base font-semibold text-foreground transition-colors hover:text-primary"
            >
              DevFlow Labs
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              Plataforma de ferramentas, produtos SaaS e automações para operações que querem crescer com eficiência.
            </p>
            <div className="flex flex-col gap-3 pt-1">
              <Link
                href="/ferramentas"
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Usar ferramentas
              </Link>
              <WhatsAppCta
                label="WhatsApp"
                size="default"
                className="!min-h-11 w-full justify-center sm:w-auto sm:justify-center"
                text="Olá, gostaria de mais informações sobre a DevFlow Labs."
              />
            </div>
          </div>

          <nav aria-label="Ferramentas">
            <h3 className="text-sm font-semibold text-foreground">Ferramentas</h3>
            <ul className="mt-3 space-y-0.5" role="list">
              {toolsLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Produtos">
            <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
            <ul className="mt-3 space-y-0.5" role="list">
              {productsLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Automação">
            <h3 className="text-sm font-semibold text-foreground">Automação</h3>
            <ul className="mt-3 space-y-0.5" role="list">
              {automacaoLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Empresa">
            <h3 className="text-sm font-semibold text-foreground">Empresa</h3>
            <ul className="mt-3 space-y-0.5" role="list">
              {empresaLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-6 sm:mt-10 sm:pt-8">
          <nav
            className="flex flex-col items-center gap-2 text-center text-xs leading-relaxed text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2 sm:text-sm"
            aria-label="Legal e institucional"
          >
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="min-h-9 py-1 hover:text-primary">
                {item.label}
              </Link>
            ))}
            <Link href="/contato" className="min-h-9 py-1 hover:text-primary">
              Contato
            </Link>
          </nav>
          <p className="mt-4 text-center text-xs text-muted-foreground sm:text-sm">
            © {currentYear} DevFlow Labs. Todos os direitos reservados.
          </p>
          <address className="mx-auto mt-3 max-w-lg text-center text-[11px] leading-relaxed text-muted-foreground not-italic sm:text-xs">
            São Paulo — SP · CNPJ: 60.517.335/0001-03 ·{" "}
            <a href="mailto:contato@devflowlabs.com.br" className="break-all text-primary hover:underline sm:break-normal">
              contato@devflowlabs.com.br
            </a>
          </address>
        </div>
      </div>
    </footer>
  );
}
