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
  { href: "/produtos/funklab-studio", label: "FunkLab Studio" },
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

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand + CTA */}
          <div className="space-y-4 lg:col-span-1">
            <Link
              href="/"
              className="text-base font-semibold text-foreground transition-colors hover:text-primary"
            >
              DevFlow Labs
            </Link>
            <p className="max-w-xs text-sm text-slate-600">
              Plataforma de ferramentas, produtos SaaS e automações para operações que querem crescer com eficiência.
            </p>
            <Link
              href="/ferramentas"
              className={cn(
                "inline-flex items-center justify-center h-9 rounded-lg px-4 text-sm font-semibold",
                "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              )}
            >
              Usar ferramentas
            </Link>
            <WhatsAppCta
              label="WhatsApp"
              size="sm"
              text="Olá, gostaria de mais informações sobre a DevFlow Labs."
            />
          </div>

          <nav aria-label="Ferramentas">
            <h3 className="text-sm font-semibold text-foreground">Ferramentas</h3>
            <ul className="mt-3 space-y-2">
              {toolsLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Produtos">
            <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
            <ul className="mt-3 space-y-2">
              {productsLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Automação">
            <h3 className="text-sm font-semibold text-foreground">Automação</h3>
            <ul className="mt-3 space-y-2">
              {automacaoLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Empresa">
            <h3 className="text-sm font-semibold text-foreground">Empresa</h3>
            <ul className="mt-3 space-y-2">
              {empresaLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            aria-label="Legal e institucional"
          >
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-primary">
                {item.label}
              </Link>
            ))}
            <Link href="/contato" className="hover:text-primary">
              Contato
            </Link>
          </nav>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            © {currentYear} DevFlow Labs. Todos os direitos reservados.
          </p>
          <address className="mt-2 text-center text-xs text-muted-foreground not-italic">
            São Paulo — SP · CNPJ: 60.517.335/0001-03 ·{" "}
            <a href="mailto:contato@devflowlabs.com.br" className="text-primary hover:underline">
              contato@devflowlabs.com.br
            </a>
          </address>
        </div>
      </div>
    </footer>
  );
}
