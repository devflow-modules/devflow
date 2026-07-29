"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { trackHeaderCtaClicked } from "@/lib/analytics";
import {
  ACCESS_PRODUCTS_LABEL,
  getHeaderProductAccessTargets,
  type HeaderProductAccessCta,
} from "@/lib/header-product-access";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Surface = "desktop" | "mobile";

type HeaderAccessProductsProps = {
  surface: Surface;
  /** Classes do botão trigger (desktop) ou estilo dos links (mobile usa lista). */
  triggerClassName?: string;
  linkClassName?: string;
  /** Fecha painéis do Header pai (ex.: mobile nav). */
  onNavigate?: () => void;
};

function trackAccess(cta: HeaderProductAccessCta | "acessar_produtos_open", surface: Surface) {
  trackHeaderCtaClicked({ cta, surface });
}

/**
 * Controlo «Acessar produtos» — WA e Financeiro com auths distintas.
 * Desktop: dropdown. Mobile: lista de links (painel do Header).
 */
export function HeaderAccessProducts({
  surface,
  triggerClassName,
  linkClassName,
  onNavigate,
}: HeaderAccessProductsProps) {
  const targets = getHeaderProductAccessTargets();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open || surface !== "desktop") return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, surface]);

  if (surface === "mobile") {
    return (
      <div className="flex flex-col gap-2" data-testid="header-access-products-mobile">
        <p className="df-text-muted text-[10px] font-bold uppercase tracking-wider">
          {ACCESS_PRODUCTS_LABEL}
        </p>
        {targets.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={linkClassName}
            onClick={() => {
              trackAccess(t.cta, "mobile");
              onNavigate?.();
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative hidden lg:block" data-testid="header-access-products-desktop">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        className={cn(triggerClassName, "inline-flex items-center gap-1 shadow-none")}
        aria-label={`${ACCESS_PRODUCTS_LABEL} — abrir menu`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) trackAccess("acessar_produtos_open", "desktop");
            return next;
          });
        }}
      >
        {ACCESS_PRODUCTS_LABEL}
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </Button>
      {open ? (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-1 w-[min(calc(100vw-2rem),16rem)] rounded-xl border border-border bg-background p-2 shadow-lg"
          role="menu"
          aria-label={ACCESS_PRODUCTS_LABEL}
        >
          {targets.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              role="menuitem"
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 hover:text-primary",
                linkClassName
              )}
              onClick={() => {
                trackAccess(t.cta, "desktop");
                setOpen(false);
                onNavigate?.();
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
