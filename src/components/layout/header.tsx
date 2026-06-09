"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  trackEcosystemLinkClick,
  trackFunnelCtaClick,
  trackHeaderCtaClicked,
  trackHeaderNavClicked,
  trackHeaderProductsOpened,
} from "@/lib/analytics";
import { HEADER_CTA_LABEL, PRIMARY_DEMO_HREF } from "@/lib/conversion-copy";
import { PRODUTOS_HUB_PATH } from "@/lib/devflow-product-catalog";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";
import { whatsappAppUrl } from "@/lib/whatsapp-app-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COMO_FUNCIONA_PATH = "/como-funciona";
const DIAGNOSTICO_PATH = "/contato";
const WHATSAPP_PLATFORM_PATH = "/produtos/whatsapp-platform";
const FAQ_PATH = "/#faq";

const ECOSYSTEM_FERRAMENTAS = [
  { href: "/ferramentas", label: "Ferramentas gratuitas", item: "ferramentas_gratuitas" },
  { href: "/ferramentas/divisao-de-contas", label: "Divisão de contas", item: "divisao_contas" },
  { href: "/ferramentas/consulta-cnpj", label: "Consulta CNPJ", item: "consulta_cnpj" },
] as const;

const ECOSYSTEM_PRODUTOS = [
  { href: FINANCEIRO_BASE_PATH, label: "Sistema Financeiro", item: "financeiro" },
  { href: PRODUTOS_HUB_PATH, label: "Catálogo de produtos", item: "products_hub" },
] as const;

const ECOSYSTEM_OUTROS = [
  { href: "/cases", label: "Cases", item: "cases" },
  { href: "/precos", label: "Preços", item: "precos" },
] as const;

function isProdutosNavActive(pathname: string): boolean {
  return pathname.startsWith("/produtos");
}

function isFerramentasGratuitasActive(pathname: string): boolean {
  if (pathname === "/ferramentas") return true;
  if (!pathname.startsWith("/ferramentas/")) return false;
  return !pathname.startsWith(`${FINANCEIRO_BASE_PATH}`);
}

function isPrecosActive(pathname: string): boolean {
  return pathname === "/precos" || pathname === "/pricing";
}

function isComoFuncionaActive(pathname: string): boolean {
  return pathname === COMO_FUNCIONA_PATH;
}

function isCasesActive(pathname: string): boolean {
  return pathname === "/cases";
}

function isDemoActive(pathname: string): boolean {
  return pathname === PRIMARY_DEMO_HREF || pathname.startsWith(`${PRIMARY_DEMO_HREF}/`);
}

function isWhatsAppPlatformActive(pathname: string): boolean {
  return (
    pathname.startsWith(WHATSAPP_PLATFORM_PATH) ||
    pathname.startsWith("/automacao-whatsapp")
  );
}

function isEcosystemActive(pathname: string): boolean {
  return (
    isFerramentasGratuitasActive(pathname) ||
    isProdutosNavActive(pathname) ||
    isCasesActive(pathname) ||
    isPrecosActive(pathname) ||
    pathname.startsWith(FINANCEIRO_BASE_PATH)
  );
}

const navText = (active: boolean) =>
  cn(
    "text-sm font-semibold transition-colors",
    active ? "text-primary" : "df-text-secondary hover:text-primary"
  );

const navUnderline = (active: boolean) =>
  active ? "relative after:absolute after:bottom-[-6px] after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary" : "";

export function Header() {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);
  const ecosystemWrapRef = useRef<HTMLDivElement>(null);

  const whatsappPlatformActive = isWhatsAppPlatformActive(pathname);
  const ecosystemActive = isEcosystemActive(pathname);
  const comoFuncionaActive = isComoFuncionaActive(pathname);
  const demoActive = isDemoActive(pathname);

  const openEcosystemMenu = useCallback(() => {
    setEcosystemOpen(true);
    if (typeof sessionStorage === "undefined") return;
    const k = "header_ecosystem_opened_session";
    if (sessionStorage.getItem(k) === "1") return;
    sessionStorage.setItem(k, "1");
    trackHeaderProductsOpened({ surface: "header_desktop_ecosystem" });
  }, []);

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

  useEffect(() => {
    if (!ecosystemOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (ecosystemWrapRef.current?.contains(e.target as Node)) return;
      setEcosystemOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEcosystemOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [ecosystemOpen]);

  const headerCtaClass = cn(
    "df-btn-primary min-h-11 shrink-0 rounded-xl font-bold",
    "shadow-[0_3px_14px_rgba(34,197,94,0.35)]",
    "px-3 text-xs min-[380px]:px-4 min-[380px]:text-sm",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.04] hover:shadow-[0_6px_22px_rgba(34,197,94,0.42)]",
    "active:scale-[0.98]"
  );

  const secondaryBtnClass =
    "df-btn-secondary min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold min-[380px]:px-4 min-[380px]:text-sm";

  const onNav = (item: string, surface: "desktop" | "mobile" = "desktop") => {
    trackHeaderNavClicked({ item, surface });
    setMobileOpen(false);
    setEcosystemOpen(false);
  };

  const onEcosystemNavigate = (
    item: string,
    surface: "desktop" | "mobile",
    extra?: () => void
  ) => {
    trackEcosystemLinkClick({ item, surface: `${surface}_header` });
    onNav(item, surface);
    extra?.();
  };

  const onAgendarDiagnostico = (surface: "desktop" | "mobile") => {
    trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: `header_${surface}` });
    trackHeaderCtaClicked({ cta: "agendar_diagnostico", surface });
    trackHeaderNavClicked({ item: "agendar_diagnostico", surface });
    setMobileOpen(false);
  };

  const onDemoNav = (surface: "desktop" | "mobile") => {
    trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: `header_nav_${surface}` });
    onNav("demo", surface);
  };

  const ecosystemDropdownLinkClass =
    "block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 hover:text-primary";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full max-w-[100vw] border-b transition-[box-shadow,background-color] duration-200",
        scrolled
          ? "border df-border-brand bg-background/95 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90"
          : "border df-border-brand bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
      )}
    >
      <div className="mx-auto flex min-h-[3.25rem] max-w-[1200px] items-center justify-between gap-2 px-3 min-[400px]:gap-3 min-[400px]:px-4 sm:min-h-[4rem] sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <Link
            href="/"
            aria-label="DevFlow Labs — página inicial"
            className="block truncate text-base font-bold tracking-tight text-foreground transition-colors hover:text-primary min-[380px]:text-lg sm:text-xl"
            onClick={() => trackHeaderNavClicked({ item: "logo_home" })}
          >
            DevFlow Labs
          </Link>
          <p className="df-text-secondary mt-0.5 hidden max-w-[22rem] truncate text-xs leading-snug xl:block">
            WhatsApp Platform · IA no repetitivo · Handoff humano
          </p>
        </div>

        <nav className="hidden items-center gap-1 lg:flex lg:gap-2" aria-label="Navegação principal">
          <Link
            href={WHATSAPP_PLATFORM_PATH}
            className={cn("px-2 py-1.5", navText(whatsappPlatformActive), navUnderline(whatsappPlatformActive))}
            onClick={() => onNav("whatsapp_platform")}
          >
            WhatsApp Platform
          </Link>

          <Link
            href={PRIMARY_DEMO_HREF}
            className={cn("px-2 py-1.5", navText(demoActive), navUnderline(demoActive))}
            onClick={() => onDemoNav("desktop")}
          >
            Demo
          </Link>

          <Link
            href={COMO_FUNCIONA_PATH}
            className={cn("px-2 py-1.5", navText(comoFuncionaActive), navUnderline(comoFuncionaActive))}
            onClick={() => onNav("como_funciona")}
          >
            Como funciona
          </Link>

          <Link
            href={FAQ_PATH}
            className={cn("px-2 py-1.5", navText(false), navUnderline(false))}
            onClick={() => onNav("faq")}
          >
            FAQ
          </Link>

          <div ref={ecosystemWrapRef} className="relative px-2 py-1">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-1 py-1.5 shadow-none",
                navText(ecosystemActive || ecosystemOpen),
                navUnderline(ecosystemActive && !ecosystemOpen)
              )}
              aria-label="Ecossistema DevFlow Labs — abrir menu"
              aria-expanded={ecosystemOpen}
              aria-haspopup="true"
              onClick={() => {
                if (ecosystemOpen) setEcosystemOpen(false);
                else openEcosystemMenu();
              }}
            >
              Ecossistema
              <ChevronDown
                className={cn("size-4 transition-transform", ecosystemOpen && "rotate-180")}
                aria-hidden
              />
            </Button>
            {ecosystemOpen ? (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-[min(calc(100vw-2rem),18rem)] rounded-xl border border-border bg-background p-2 shadow-lg"
                role="menu"
              >
                <p className="df-text-muted px-2 pb-1 text-[10px] font-bold uppercase tracking-wider">
                  Ferramentas gratuitas
                </p>
                {ECOSYSTEM_FERRAMENTAS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className={ecosystemDropdownLinkClass}
                    onClick={() => onEcosystemNavigate(link.item, "desktop")}
                  >
                    {link.label}
                  </Link>
                ))}
                <p className="df-text-muted mt-2 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider">
                  Produtos complementares
                </p>
                {ECOSYSTEM_PRODUTOS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className={ecosystemDropdownLinkClass}
                    onClick={() => onEcosystemNavigate(link.item, "desktop")}
                  >
                    {link.label}
                  </Link>
                ))}
                <p className="df-text-muted mt-2 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider">
                  Mais
                </p>
                {ECOSYSTEM_OUTROS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className={ecosystemDropdownLinkClass}
                    onClick={() => onEcosystemNavigate(link.item, "desktop")}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 min-[400px]:gap-2 sm:gap-2">
          <Link
            href={whatsappAppUrl("/login")}
            className={cn(secondaryBtnClass, "hidden lg:inline-flex")}
            onClick={() => trackHeaderCtaClicked({ cta: "entrar", surface: "desktop" })}
          >
            Entrar
          </Link>
          <Link
            href={DIAGNOSTICO_PATH}
            aria-label="Agendar diagnóstico da operação no WhatsApp"
            className={cn(headerCtaClass, demoActive && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background")}
            onClick={() => onAgendarDiagnostico("desktop")}
          >
            {HEADER_CTA_LABEL}
          </Link>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setMobileOpen((o) => !o)}
            className="df-text-secondary size-11 min-h-11 min-w-11 rounded-xl border border-border bg-transparent shadow-none transition-colors hover:bg-muted lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
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
        <div className="mx-auto max-w-[1200px] space-y-4 px-3 py-4 sm:px-6">
          <div className="flex flex-col gap-2">
            <Link
              href={DIAGNOSTICO_PATH}
              aria-label="Agendar diagnóstico da operação no WhatsApp"
              className={cn(headerCtaClass, "w-full")}
              onClick={() => onAgendarDiagnostico("mobile")}
            >
              {HEADER_CTA_LABEL}
            </Link>
            <Link
              href={whatsappAppUrl("/login")}
              className={cn(secondaryBtnClass, "w-full")}
              onClick={() => {
                trackHeaderCtaClicked({ cta: "entrar", surface: "mobile" });
                setMobileOpen(false);
              }}
            >
              Entrar
            </Link>
          </div>

          <nav aria-label="Navegação mobile">
            <p className="df-text-muted mb-1 text-[10px] font-bold uppercase tracking-wider">
              WhatsApp Platform
            </p>
            <ul className="flex flex-col gap-0.5 border-b border-border pb-3" role="list">
              <li>
                <Link
                  href={WHATSAPP_PLATFORM_PATH}
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-semibold text-foreground hover:bg-primary/5 hover:text-primary"
                  onClick={() => onNav("whatsapp_platform", "mobile")}
                >
                  WhatsApp Platform
                </Link>
              </li>
              <li>
                <Link
                  href={PRIMARY_DEMO_HREF}
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-semibold text-foreground hover:bg-primary/5 hover:text-primary"
                  onClick={() => onDemoNav("mobile")}
                >
                  Demo
                </Link>
              </li>
              <li>
                <Link
                  href={COMO_FUNCIONA_PATH}
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-semibold text-foreground hover:bg-primary/5 hover:text-primary"
                  onClick={() => onNav("como_funciona", "mobile")}
                >
                  Como funciona
                </Link>
              </li>
              <li>
                <Link
                  href={FAQ_PATH}
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-semibold text-foreground hover:bg-primary/5 hover:text-primary"
                  onClick={() => onNav("faq", "mobile")}
                >
                  FAQ
                </Link>
              </li>
            </ul>

            <p className="df-text-muted mb-1 mt-3 text-[10px] font-bold uppercase tracking-wider">
              Ecossistema
            </p>
            <ul className="flex flex-col gap-0.5" role="list">
              {[...ECOSYSTEM_FERRAMENTAS, ...ECOSYSTEM_PRODUTOS, ...ECOSYSTEM_OUTROS].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 hover:text-primary"
                    onClick={() => onEcosystemNavigate(link.item, "mobile")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
