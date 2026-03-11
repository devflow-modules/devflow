import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const productLinks = [
  { href: "/produtos/funklab-studio", label: "FunkLab Studio" },
  { href: "/produtos/whatsapp-platform", label: "Automação WhatsApp" },
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
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Link
              href="/"
              className="text-base font-semibold text-foreground transition-colors hover:text-primary"
            >
              DevFlow Labs
            </Link>
            <p className="max-w-xs text-sm text-slate-600">
              Software Engineering • Automation • AI Systems • WhatsApp Automation Platform
            </p>
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

          <div className="flex flex-col gap-4">
            <WhatsAppCta label="WhatsApp" size="sm" />
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {currentYear} DevFlow Labs. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
