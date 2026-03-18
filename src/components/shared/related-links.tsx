import Link from "next/link";
import { ArrowRight, Wrench, Package, MessageCircle, Wallet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "ferramentas" | "produtos" | "automacao-whatsapp" | "financeiro" | "default";

const LINK_SETS: Record<
  Variant,
  { href: string; label: string; icon?: React.ComponentType<{ className?: string }> }[]
> = {
  ferramentas: [
    { href: "/produtos", label: "Produtos", icon: Package },
    { href: "/automacao-whatsapp", label: "Automação WhatsApp", icon: MessageCircle },
    { href: "/ferramentas/financeiro", label: "Sistema Financeiro", icon: Wallet },
    { href: "/contato", label: "Contato", icon: FileText },
  ],
  produtos: [
    { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
    { href: "/automacao-whatsapp", label: "Automação WhatsApp", icon: MessageCircle },
    { href: "/ferramentas/financeiro", label: "Sistema Financeiro", icon: Wallet },
    { href: "/contato", label: "Contato", icon: FileText },
  ],
  "automacao-whatsapp": [
    { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
    { href: "/produtos", label: "Produtos", icon: Package },
    { href: "/ferramentas/financeiro", label: "Sistema Financeiro", icon: Wallet },
    { href: "/demo", label: "Ver demo", icon: MessageCircle },
  ],
  financeiro: [
    { href: "/ferramentas", label: "Hub de ferramentas", icon: Wrench },
    { href: "/produtos", label: "Produtos", icon: Package },
    { href: "/automacao-whatsapp", label: "Automação WhatsApp", icon: MessageCircle },
    { href: "/ferramentas/divisao-de-contas", label: "Divisão de contas", icon: Wallet },
  ],
  default: [
    { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
    { href: "/produtos", label: "Produtos", icon: Package },
    { href: "/automacao-whatsapp", label: "Automação WhatsApp", icon: MessageCircle },
    { href: "/contato", label: "Contato", icon: FileText },
  ],
};

type RelatedLinksProps = {
  variant: Variant;
  title?: string;
  className?: string;
};

export function RelatedLinks({
  variant,
  title = "Continue explorando",
  className,
}: RelatedLinksProps) {
  const links = LINK_SETS[variant] ?? LINK_SETS.default;

  return (
    <nav
      aria-label="Links relacionados"
      className={cn("rounded-2xl border border-border bg-muted/30 p-6", className)}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 flex flex-wrap gap-3" role="list">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                {item.label}
                <ArrowRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
