"use client";

import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { trackCtaDemoClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Início" },
  { href: "/automacao-whatsapp", label: "Automação WhatsApp" },
  { href: "/chatbot-whatsapp", label: "Chatbot" },
  { href: "/automacao-whatsapp-tabacaria", label: "Tabacarias" },
  { href: "/automacao-whatsapp-restaurante", label: "Restaurantes" },
  { href: "/demo", label: "Demo" },
  { href: "/precos", label: "Preços" },
  { href: "/ferramentas", label: "Ferramentas" },
  { href: "/blog", label: "Blog" },
  { href: "/contato", label: "Contato" },
];

export function Header() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b df-border-dark",
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
              className="df-text-secondary text-sm font-medium transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/demo"
            onClick={() => trackCtaDemoClick("header")}
            className="df-btn-ghost hidden rounded-lg text-sm font-medium sm:inline-flex"
          >
            Ver demo
          </Link>
          <WhatsAppCta
            label="Fale no WhatsApp"
            size="sm"
            text="Olá, quero entender como funciona a automação."
          />
        </div>
      </div>
    </header>
  );
}
