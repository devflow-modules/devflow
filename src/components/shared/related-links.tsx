import Link from "next/link";
import {
  ArrowRight,
  Wrench,
  Package,
  MessageCircle,
  Wallet,
  FileText,
  PlayCircle,
  Code2,
  Zap,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "ferramentas" | "produtos" | "automacao-whatsapp" | "financeiro" | "default";

const LINK_SETS: Record<
  Variant,
  { href: string; label: string; icon?: React.ComponentType<{ className?: string }> }[]
> = {
  ferramentas: [
    { href: "/demo", label: "Ver demo", icon: PlayCircle },
    { href: "/produtos/whatsapp-platform", label: "WhatsApp Platform", icon: MessageCircle },
    { href: "/produtos", label: "Catálogo de produtos", icon: Package },
    { href: "/automacao-whatsapp", label: "Automação WhatsApp", icon: Zap },
    { href: "/whatsapp-business-api", label: "WhatsApp Business API", icon: Code2 },
    { href: "/contato", label: "Contato", icon: FileText },
  ],
  produtos: [
    { href: "/demo", label: "Ver demo", icon: PlayCircle },
    { href: "/produtos/whatsapp-platform", label: "WhatsApp Platform", icon: MessageCircle },
    { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
    { href: "/automacao-whatsapp", label: "Automação WhatsApp", icon: Zap },
    { href: "/contato", label: "Contato", icon: FileText },
  ],
  "automacao-whatsapp": [
    { href: "/demo", label: "Ver demo", icon: PlayCircle },
    { href: "/produtos/whatsapp-platform", label: "WhatsApp Platform", icon: MessageCircle },
    { href: "/whatsapp-business-api", label: "WhatsApp Business API", icon: Code2 },
    { href: "/precos", label: "Preços", icon: Tag },
    { href: "/como-funciona", label: "Como funciona", icon: FileText },
    { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
  ],
  financeiro: [
    { href: "/demo", label: "Ver demo", icon: PlayCircle },
    { href: "/produtos/whatsapp-platform", label: "WhatsApp Platform", icon: MessageCircle },
    { href: "/ferramentas", label: "Hub de ferramentas", icon: Wrench },
    { href: "/produtos", label: "Produtos", icon: Package },
    { href: "/automacao-whatsapp", label: "Automação WhatsApp", icon: Zap },
    { href: "/ferramentas/divisao-de-contas", label: "Divisão de contas", icon: Wallet },
  ],
  default: [
    { href: "/demo", label: "Ver demo", icon: PlayCircle },
    { href: "/produtos/whatsapp-platform", label: "WhatsApp Platform", icon: MessageCircle },
    { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
    { href: "/produtos", label: "Produtos", icon: Package },
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
      className={cn("rounded-2xl border border-border bg-muted/30 p-4 sm:p-6", className)}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap sm:gap-3" role="list">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0 sm:w-auto">
              <Link
                href={item.href}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary sm:w-auto sm:justify-start"
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
