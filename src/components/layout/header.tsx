"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { trackHeaderCtaClicked, trackHeaderNavClicked, trackHeaderProductsOpened, trackProductsDropdownItemClicked } from "@/lib/analytics";
import { HEADER_CTA_LABEL, PRIMARY_DEMO_HREF } from "@/lib/conversion-copy";
import {
  DEVFLOW_PRODUCT_CATALOG,
  PRODUTOS_HUB_PATH,
} from "@/lib/devflow-product-catalog";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";
import { whatsappAppUrl } from "@/lib/whatsapp-app-url";
import { cn } from "@/lib/utils";

const COMO_FUNCIONA_PATH = "/como-funciona";

/** Só rotas sob /produtos — Financeiro no header é oferta, mas rotas /ferramentas/financeiro não marcam “Produtos”. */
function isProdutosNavActive(pathname: string): boolean {
  return pathname.startsWith("/produtos");
}

/** Hub + ferramentas gratuitas; exclui app Financeiro (destaque fica no CTA). */
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

function isDemoActive(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

const navText = (active: boolean) =>
  cn(
    "text-sm font-semibold transition-colors",
    active ? "text-primary" : "text-slate-600 hover:text-primary"
  );

const navUnderline = (active: boolean) =>
  active ? "relative after:absolute after:bottom-[-6px] after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary" : "";

export function Header() {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsWrapRef = useRef<HTMLDivElement>(null);

  const produtosActive = isProdutosNavActive(pathname);
  const ferramentasActive = isFerramentasGratuitasActive(pathname);
  const precosActive = isPrecosActive(pathname);
  const comoFuncionaActive = isComoFuncionaActive(pathname);
  const demoActive = isDemoActive(pathname);

  const openProductsMenu = useCallback(() => {
    setProductsOpen(true);
    if (typeof sessionStorage === "undefined") return;
    const k = "header_products_opened_session";
    if (sessionStorage.getItem(k) === "1") return;
    sessionStorage.setItem(k, "1");
    trackHeaderProductsOpened({ surface: "header_desktop" });
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
    if (!productsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (productsWrapRef.current?.contains(e.target as Node)) return;
      setProductsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [productsOpen]);

  const headerCtaClass = cn(
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl font-bold",
    "bg-primary text-primary-foreground shadow-[0_3px_14px_rgba(34,197,94,0.35)]",
    "px-3 text-xs min-[380px]:px-4 min-[380px]:text-sm",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.04] hover:shadow-[0_6px_22px_rgba(34,197,94,0.42)] hover:bg-[#16a34a]",
    "active:scale-[0.98]"
  );

  const secondaryBtnClass =
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-transparent px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-muted min-[380px]:px-4 min-[380px]:text-sm";

  const onNav = (item: string, surface: "desktop" | "mobile" = "desktop") => {
    trackHeaderNavClicked({ item, surface });
    setMobileOpen(false);
    setProductsOpen(false);
  };

  const onCatalogProductNavigate = (
    productId: string,
    targetHref: string,
    navItemKey: string,
    surface: "desktop" | "mobile"
  ) => {
    trackProductsDropdownItemClicked({
      productId,
      targetHref,
      surface,
    });
    onNav(navItemKey, surface);
  };

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
            aria-label="DevFlow Labs — página inicial"
            className="block truncate text-base font-bold tracking-tight text-foreground transition-colors hover:text-primary min-[380px]:text-lg sm:text-xl"
            onClick={() => trackHeaderNavClicked({ item: "logo_home" })}
          >
            DevFlow Labs
          </Link>
          <p className="mt-0.5 hidden max-w-[20rem] truncate text-[11px] leading-snug text-slate-500 xl:block">
            Ferramentas gratuitas, produtos SaaS e automação — comece em minutos
          </p>
        </div>

        <nav
          className="hidden items-center gap-1 lg:flex lg:gap-2"
          aria-label="Navegação principal"
        >
          <div ref={productsWrapRef} className="relative px-2 py-1">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-1 py-1.5",
                navText(produtosActive || productsOpen),
                navUnderline(produtosActive && !productsOpen)
              )}
              aria-label="Nossos produtos — abrir menu"
              aria-expanded={productsOpen}
              aria-haspopup="true"
              onClick={() => {
                if (productsOpen) setProductsOpen(false);
                else openProductsMenu();
              }}
            >
              Nossos produtos
              <ChevronDown
                className={cn("size-4 transition-transform", productsOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            {productsOpen ? (
              <div
                className="absolute left-0 top-full z-50 mt-1 w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-border bg-background p-2 shadow-lg"
                role="menu"
              >
                <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Catálogo
                </p>
                <div className="flex flex-col gap-1.5">
                  {DEVFLOW_PRODUCT_CATALOG.map((p) => (
                    <div
                      key={p.id}
                      role="menuitem"
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        p.featured
                          ? "border-primary/40 bg-primary/[0.06]"
                          : p.id === "whatsapp_platform"
                            ? "border-emerald-500/45 bg-emerald-500/[0.07] ring-1 ring-emerald-500/20 hover:bg-emerald-500/[0.1]"
                            : "border-transparent bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{p.name}</span>
                            {p.badge ? (
                              <span className="rounded-full border border-primary/25 bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
                                {p.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-snug text-muted-foreground">{p.summary}</p>
                        </div>
                        <Link
                          href={p.href}
                          aria-label={`Abrir página de ${p.name}`}
                          className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                          onClick={() => onCatalogProductNavigate(p.id, p.href, p.navItemKey, "desktop")}
                        >
                          Abrir
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href={PRODUTOS_HUB_PATH}
                  role="menuitem"
                  className="mt-2 block rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                  onClick={() => onNav("products_hub")}
                >
                  Ver catálogo completo
                </Link>
              </div>
            ) : null}
          </div>

          <Link
            href="/ferramentas"
            className={cn("px-2 py-1.5", navText(ferramentasActive), navUnderline(ferramentasActive))}
            onClick={() => onNav("ferramentas_gratuitas")}
          >
            Ferramentas gratuitas
          </Link>

          <Link
            href={COMO_FUNCIONA_PATH}
            className={cn(
              "px-2 py-1.5",
              navText(comoFuncionaActive),
              navUnderline(comoFuncionaActive)
            )}
            onClick={() => onNav("como_funciona")}
          >
            Como funciona
          </Link>

          <Link
            href="/precos"
            className={cn("px-2 py-1.5", navText(precosActive), navUnderline(precosActive))}
            onClick={() => onNav("precos")}
          >
            Preços
          </Link>
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
            href={PRIMARY_DEMO_HREF}
            aria-label="Ver demonstração guiada de atendimento no WhatsApp"
            className={cn(headerCtaClass, demoActive && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background")}
            onClick={() => {
              trackHeaderCtaClicked({ cta: "ver_demo", surface: "desktop" });
              trackHeaderNavClicked({ item: "ver_demo", surface: "desktop" });
            }}
          >
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
        <div className="mx-auto max-w-[1200px] space-y-4 px-3 py-4 sm:px-6">
          <div className="flex flex-col gap-2">
            <Link
              href={PRIMARY_DEMO_HREF}
              aria-label="Ver demonstração guiada de atendimento no WhatsApp"
              className={cn(headerCtaClass, "w-full")}
              onClick={() => {
                trackHeaderCtaClicked({ cta: "ver_demo", surface: "mobile" });
                trackHeaderNavClicked({ item: "ver_demo", surface: "mobile" });
                setMobileOpen(false);
              }}
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
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Nossos produtos
            </p>
            <ul className="flex flex-col gap-2 border-b border-border pb-3" role="list">
              {DEVFLOW_PRODUCT_CATALOG.map((p) => (
                <li key={p.id}>
                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2.5",
                      p.featured
                        ? "border-primary/35 bg-primary/[0.06]"
                        : p.id === "whatsapp_platform"
                          ? "border-emerald-500/40 bg-emerald-500/[0.08] ring-1 ring-emerald-500/20"
                          : "border-border bg-muted/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-foreground">{p.name}</span>
                          {p.badge ? (
                            <span className="rounded-full border border-primary/25 bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase text-primary">
                              {p.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">{p.summary}</p>
                      </div>
                      <Link
                        href={p.href}
                        aria-label={`Abrir página de ${p.name}`}
                        className="shrink-0 rounded-lg bg-primary px-2.5 py-2 text-xs font-bold text-primary-foreground"
                        onClick={() => onCatalogProductNavigate(p.id, p.href, p.navItemKey, "mobile")}
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
              <li>
                <Link
                  href={PRODUTOS_HUB_PATH}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-primary/30 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5"
                  onClick={() => onNav("products_hub", "mobile")}
                >
                  Ver catálogo completo
                </Link>
              </li>
            </ul>

            <ul className="mt-3 flex flex-col gap-0.5" role="list">
              <li>
                <Link
                  href="/ferramentas"
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-semibold text-slate-800 hover:bg-primary/5 hover:text-primary"
                  onClick={() => onNav("ferramentas_gratuitas", "mobile")}
                >
                  Ferramentas gratuitas
                </Link>
              </li>
              <li>
                <Link
                  href={COMO_FUNCIONA_PATH}
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-semibold text-slate-800 hover:bg-primary/5 hover:text-primary"
                  onClick={() => onNav("como_funciona", "mobile")}
                >
                  Como funciona
                </Link>
              </li>
              <li>
                <Link
                  href="/precos"
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-semibold text-slate-800 hover:bg-primary/5 hover:text-primary"
                  onClick={() => onNav("precos", "mobile")}
                >
                  Preços
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
