"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, Music2, Package, Search, Wallet } from "lucide-react";
import {
  trackProductsPageCardClicked,
  trackProductsPageCtaClicked,
  trackProductsSelectionHelpUsed,
} from "@/lib/analytics";
import {
  type DevflowCatalogProduct,
  type DevflowProductId,
  DEVFLOW_PRODUCT_CATALOG,
} from "@/lib/devflow-product-catalog";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";
import { PRIMARY_DEMO_HREF } from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const WHATSAPP_PRODUCT_HREF = "/produtos/whatsapp-platform";

const iconById: Record<DevflowProductId, typeof Wallet> = {
  financeiro: Wallet,
  whatsapp_platform: MessageCircle,
  investigamais: Search,
  funklab: Music2,
};

const iconStyleById: Record<
  DevflowProductId,
  { wrap: string; icon: string }
> = {
  financeiro: { wrap: "bg-primary/10", icon: "text-primary" },
  whatsapp_platform: { wrap: "bg-emerald-500/10", icon: "text-emerald-700" },
  investigamais: { wrap: "bg-emerald-500/10", icon: "text-emerald-700" },
  funklab: { wrap: "bg-violet-500/10", icon: "text-violet-600" },
};

const comoEscolher = [
  {
    trigger: "Quer automatizar atendimento e escalar no WhatsApp",
    productId: "whatsapp_platform" as const,
    href: WHATSAPP_PRODUCT_HREF,
    name: "WhatsApp Platform",
  },
  {
    trigger: "Quer organizar dinheiro e fechar o mês com clareza",
    productId: "financeiro" as const,
    href: FINANCEIRO_BASE_PATH,
    name: "Financeiro",
  },
  {
    trigger: "Quer validar CNPJ e dados com contexto rápido",
    productId: "investigamais" as const,
    href: "/produtos/investigamais",
    name: "Investigamais",
  },
  {
    trigger: "Quer grooves e sketches MIDI na hora para produzir",
    productId: "funklab" as const,
    href: "/produtos/funklab-studio",
    name: "FunkLab",
  },
];

function ProductCard({ product }: { product: DevflowCatalogProduct }) {
  const Icon = iconById[product.id];
  const styles = iconStyleById[product.id];

  if (product.id === "whatsapp_platform") {
    return (
      <article
        className={cn(
          "flex flex-col rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.07] to-card p-6 shadow-sm ring-1 ring-emerald-500/15 transition-all duration-200 hover:shadow-lg"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex size-10 items-center justify-center rounded-xl", styles.wrap)}>
            <Icon className={cn("size-5", styles.icon)} aria-hidden />
          </div>
          {product.badge ? (
            <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              {product.badge}
            </span>
          ) : null}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">{product.name}</h3>
        <p className="mt-1 text-sm text-slate-600">{product.cardPitch}</p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          <span className="text-foreground/80">Para quem:</span> {product.audience}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={PRIMARY_DEMO_HREF}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
              "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            )}
            onClick={() =>
              trackProductsPageCtaClicked({
                productId: product.id,
                cta: "ver_exemplo",
                targetHref: PRIMARY_DEMO_HREF,
              })
            }
          >
            Ver demo
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={WHATSAPP_PRODUCT_HREF}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-emerald-600/30 bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-500/[0.06]"
            )}
            onClick={() =>
              trackProductsPageCtaClicked({
                productId: product.id,
                cta: "abrir",
                targetHref: WHATSAPP_PRODUCT_HREF,
              })
            }
          >
            Ver produto principal
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <Link
      href={product.href}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={() => {
        trackProductsPageCardClicked({
          productId: product.id,
          targetHref: product.href,
        });
        trackProductsPageCtaClicked({
          productId: product.id,
          cta: "abrir",
          targetHref: product.href,
        });
      }}
    >
      <article
        className={cn(
          "flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg"
        )}
      >
        <div className={cn("flex size-10 items-center justify-center rounded-xl", styles.wrap)}>
          <Icon className={cn("size-5", styles.icon)} aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">{product.name}</h3>
        <p className="mt-1 text-sm text-slate-600">{product.cardPitch}</p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          <span className="text-foreground/80">Para quem:</span> {product.audience}
        </p>
        <span
          className={cn(
            "mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
            "bg-primary text-primary-foreground transition-colors group-hover:bg-primary/90"
          )}
        >
          Abrir
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </article>
    </Link>
  );
}

export function ProductsHubClient() {
  const helpRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = helpRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        trackProductsSelectionHelpUsed();
        obs.disconnect();
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <section
        className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-16 sm:py-20"
        aria-labelledby="produtos-heading"
      >
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)",
            }}
          />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <Package className="size-3.5" aria-hidden />
              Plataforma DevFlow
            </div>
            <h1
              id="produtos-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Produtos DevFlow
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Soluções para organizar, automatizar e escalar sua operação — cada uma com próximo
              passo claro.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href={PRIMARY_DEMO_HREF}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold",
                  "bg-primary text-primary-foreground shadow-[0_3px_14px_rgba(34,197,94,0.35)] transition-all hover:bg-[#16a34a] hover:shadow-md"
                )}
                onClick={() =>
                  trackProductsPageCtaClicked({
                    productId: "hub_hero",
                    cta: "ver_exemplo",
                    targetHref: PRIMARY_DEMO_HREF,
                  })
                }
              >
                Ver demo
                <ArrowRight className="size-5 shrink-0" aria-hidden />
              </Link>
              <Link
                href={WHATSAPP_PRODUCT_HREF}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted/60"
                )}
                onClick={() =>
                  trackProductsPageCtaClicked({
                    productId: "hub_hero",
                    cta: "abrir",
                    targetHref: WHATSAPP_PRODUCT_HREF,
                  })
                }
              >
                Ver produto principal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="lista-produtos"
        className="bg-white py-20 sm:py-24"
        aria-labelledby="lista-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 id="lista-heading" className="sr-only">
            Catálogo de produtos
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {DEVFLOW_PRODUCT_CATALOG.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section
        ref={helpRef}
        className="border-t border-border bg-slate-50/80 py-16 sm:py-20"
        aria-labelledby="como-escolher-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="como-escolher-heading"
            className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Como escolher
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Use o que combina com o problema de hoje — sem misturar demo com produto.
          </p>
          <ul className="mt-8 space-y-4" role="list">
            {comoEscolher.map((row) => (
              <li
                key={row.productId}
                className="rounded-xl border border-border bg-card p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <p className="text-sm font-medium text-foreground sm:min-w-0 sm:flex-1">
                  <span className="text-muted-foreground">Se </span>
                  {row.trigger}
                  <span className="text-muted-foreground"> → </span>
                </p>
                <Link
                  href={row.href}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline sm:mt-0 sm:shrink-0"
                  onClick={() =>
                    trackProductsPageCtaClicked({
                      productId: row.productId,
                      cta: "abrir",
                      targetHref: row.href,
                    })
                  }
                >
                  {row.name}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
