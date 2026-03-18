"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { HEADER_CTA_LABEL } from "@/lib/conversion-copy";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const headerCtaClass = cn(
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl font-bold",
    "bg-primary text-primary-foreground shadow-[0_3px_14px_rgba(34,197,94,0.35)]",
    "px-3 text-xs min-[380px]:px-4 min-[380px]:text-sm",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.04] hover:shadow-[0_6px_22px_rgba(34,197,94,0.42)] hover:bg-[#16a34a]",
    "active:scale-[0.98]"
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full max-w-[100vw] border-b transition-[box-shadow,background-color] duration-200",
        scrolled
          ? "border-slate-200/90 bg-background/95 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90"
          : "border-slate-200/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
      )}
    >
      <div className="mx-auto flex min-h-[3.25rem] max-w-[1200px] items-center justify-between gap-2 px-3 min-[400px]:gap-3 min-[400px]:px-4 sm:min-h-[4rem] sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <Link
            href="/"
            className="block truncate text-base font-bold tracking-tight text-foreground transition-colors hover:text-primary min-[380px]:text-lg sm:text-xl"
          >
            DevFlow Labs
          </Link>
          <p className="hidden truncate text-[11px] leading-snug text-slate-500 lg:mt-0.5 lg:block lg:max-w-[14rem]">
            Hub de ferramentas + automações
          </p>
        </div>

        <nav
          className="hidden items-center gap-5 lg:flex lg:gap-6"
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

        <div className="flex shrink-0 items-center gap-1.5 min-[400px]:gap-2 sm:gap-3">
          <Link href="/ferramentas" className={headerCtaClass}>
            {HEADER_CTA_LABEL}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-transparent text-slate-600 transition-colors hover:bg-muted lg:hidden"
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
        aria-modal="true"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain border-t border-border bg-background pt-0 lg:hidden",
          "top-[3.3125rem] sm:top-[4.0625rem]",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <nav className="mx-auto max-w-[1200px] px-3 py-4 sm:px-6" aria-label="Navegação mobile">
          <ul className="flex flex-col gap-1" role="list">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-semibold text-slate-800 active:bg-primary/10 hover:bg-primary/5 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
