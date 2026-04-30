import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";

const productLinks = [
  { href: "/produtos/funklab-studio", label: "FunkLab Studio" },
  { href: "/produtos/whatsapp-platform", label: "Automação WhatsApp" },
  { href: "/ferramentas", label: "Ferramentas" },
];

const segmentLinks = [
  { href: "/automacao-whatsapp", label: "Automação WhatsApp" },
  { href: "/automacao-whatsapp-tabacaria", label: "Tabacarias" },
  { href: "/automacao-whatsapp-restaurante", label: "Restaurantes" },
  { href: "/automacao-whatsapp-loja", label: "Lojas" },
  { href: "/automacao-whatsapp-clinica", label: "Clínicas" },
  { href: "/demo", label: "Demo" },
  { href: "/precos", label: "Preços" },
  { href: "/blog", label: "Blog" },
];

const projectLinks = [
  { href: "/projetos", label: "Projetos" },
  {
    href: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com",
    label: "GitHub",
    external: true,
  },
];

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-3">
            <Link
              href="/"
              className="text-base font-semibold text-foreground transition-colors hover:text-primary"
            >
              DevFlow Labs
            </Link>
            <p className="max-w-xs text-sm df-text-secondary">
              Software Engineering • Automation • AI Systems • WhatsApp Automation Platform
            </p>
            <address className="not-italic text-sm df-text-secondary space-y-1">
              <span>São Paulo — SP</span>
              <br />
              <span>CNPJ: 60.517.335/0001-03</span>
              <br />
              <a
                href="mailto:contato@devflowlabs.com.br"
                className="text-primary hover:underline"
              >
                contato@devflowlabs.com.br
              </a>
            </address>
            <WhatsAppCta
              label="WhatsApp"
              size="sm"
              text="Olá, gostaria de mais informações sobre a DevFlow Labs."
            />
          </div>

          <nav aria-label="Produtos">
            <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
            <ul className="mt-3 space-y-2">
              {productLinks.map((item) => (
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

          <nav aria-label="Automação por segmento">
            <h3 className="text-sm font-semibold text-foreground">Automação</h3>
            <ul className="mt-3 space-y-2">
              {segmentLinks.map((item) => (
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

          <nav aria-label="Projetos">
            <h3 className="text-sm font-semibold text-foreground">Projetos</h3>
            <ul className="mt-3 space-y-2">
              {projectLinks.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    {...(item.external && {
                      target: "_blank",
                      rel: "noopener noreferrer",
                    })}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Links rápidos">
            <h3 className="text-sm font-semibold text-foreground">Contato</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/contato"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Página de contato
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Ver demonstração
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            aria-label="Legal e institucional"
          >
            <Link href="/sobre" className="hover:text-primary">
              Sobre
            </Link>
            <Link href="/privacidade" className="hover:text-primary">
              Política de Privacidade
            </Link>
            <Link href="/termos" className="hover:text-primary">
              Termos de Uso
            </Link>
            <Link href="/cookies" className="hover:text-primary">
              Cookies
            </Link>
            <Link href="/contato" className="hover:text-primary">
              Contato
            </Link>
          </nav>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            © {currentYear} DevFlow Labs. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
