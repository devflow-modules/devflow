"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/ferramentas", label: "Ferramentas" },
  { href: "/produtos", label: "Produtos" },
  { href: "/automacao-whatsapp", label: "Automação WhatsApp" },
  { href: "/projetos", label: "Projetos" },
  { href: "/blog", label: "Blog" },
  { href: "/contato", label: "Contato" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-slate-200",
        "bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
      )}
    >
      <div className="mx-auto flex min-h-[3.5rem] max-w-[1200px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:min-h-[4.25rem] lg:px-8">
        <div className="flex min-w-0 flex-1 flex-col justify-center lg:flex-none">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-foreground transition-colors hover:text-primary sm:text-xl"
          >
            DevFlow Labs
          </Link>
          <p className="hidden text-[11px] leading-snug text-slate-500 lg:mt-0.5 lg:block lg:max-w-[14rem]">
            Hub de ferramentas + automações para negócios
          </p>
        </div>

        <nav
          className="hidden items-center gap-5 lg:flex lg:gap-7"
          aria-label="Navegação principal"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/ferramentas"
            className={cn(
              "hidden sm:inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold",
              "bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(34,197,94,0.25)]",
              "transition-all hover:bg-[#16a34a] hover:shadow-md lg:flex"
            )}
          >
            <span className="hidden sm:inline">Começar agora (1 min)</span>
            <span className="sm:hidden">Começar agora</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-transparent text-slate-600 transition-colors hover:bg-muted lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        role="dialog"
        aria-label="Menu de navegação"
        className={cn(
          "lg:hidden border-t border-border bg-background",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <nav className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6" aria-label="Navegação mobile">
          <p className="mb-3 text-xs font-medium text-slate-500">
            Hub de ferramentas + automações para negócios
          </p>
          <ul className="flex flex-col gap-0.5" role="list">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-primary/5 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-3 border-t border-border pt-3">
              <Link
                href="/ferramentas"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground"
              >
                Começar agora (leva menos de 1 min)
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
