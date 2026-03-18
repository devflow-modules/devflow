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
          className="hidden items-center gap-6 lg:flex lg:gap-8"
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

        <div className="flex items-center gap-3">
          <Link
            href="/ferramentas"
            className={cn(
              "hidden lg:inline-flex items-center justify-center h-9 rounded-lg px-4 text-sm font-semibold",
              "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            )}
          >
            Usar ferramentas
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-transparent text-slate-600 hover:bg-muted lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-label="Menu de navegação"
        className={cn(
          "lg:hidden border-t border-border bg-background",
          "transition-all duration-200 ease-out",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <nav className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8" aria-label="Navegação mobile">
          <ul className="flex flex-col gap-1" role="list">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-muted hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-border pt-2">
              <Link
                href="/ferramentas"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold",
                  "bg-primary text-primary-foreground"
                )}
              >
                Usar ferramentas
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
