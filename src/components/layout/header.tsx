import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Início" },
  { href: "/produtos/whatsapp-platform", label: "WhatsApp" },
  { href: "/automacao-whatsapp-tabacaria", label: "Tabacarias" },
  { href: "/automacao-whatsapp-restaurante", label: "Restaurantes" },
  { href: "/demo", label: "Demo" },
  { href: "/projetos", label: "Projetos" },
  { href: "/contato", label: "Contato" },
];

export function Header() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-slate-200",
        "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
        "shadow-[0_1px_0_0_rgba(0,0,0,0.03)]"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          DevFlow Labs
        </Link>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Navegação principal"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <WhatsAppCta size="sm" />
        </div>
      </div>
    </header>
  );
}
