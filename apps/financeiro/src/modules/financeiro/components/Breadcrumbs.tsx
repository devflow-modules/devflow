"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

const BASE = "/ferramentas/financeiro";

type Crumb = { href: string; label: string };

const LABELS_BY_PATH: Record<string, string> = {
  [`${BASE}/dashboard`]: "Dashboard",
  [`${BASE}/sources`]: "Fontes",
  [`${BASE}/expenses`]: "Lançamentos",
  [`${BASE}/rules`]: "Regras",
  [`${BASE}/settings`]: "Configurações",
  [`${BASE}/onboarding`]: "Onboarding",
  [`${BASE}/proximas-contas`]: "Próximas Contas",
  [`${BASE}/historico`]: "Histórico",
  [`${BASE}/importar`]: "Importar CSV",
};

function titleize(segment: string) {
  const clean = segment.replace(/[-_]+/g, " ").trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function buildCrumbs(pathname: string): Crumb[] {
  const cleanPath = pathname.split("?")[0] ?? "/";
  const basePrefix = BASE + "/";
  const relativePath = cleanPath.startsWith(basePrefix) ? cleanPath.slice(basePrefix.length) : cleanPath.slice(1);
  const segments = relativePath.split("/").filter(Boolean);

  if (segments.length === 0) return [{ href: `${BASE}/dashboard`, label: "Dashboard" }];

  const crumbs: Crumb[] = [];
  let current = BASE;
  for (const seg of segments) {
    current += `/${seg}`;
    const label = LABELS_BY_PATH[current] ?? titleize(seg);
    crumbs.push({ href: current, label });
  }

  if (crumbs[0]?.href !== `${BASE}/dashboard`) {
    crumbs.unshift({ href: `${BASE}/dashboard`, label: "Dashboard" });
  }

  if (crumbs.length >= 2 && crumbs[0].href === crumbs[1].href) {
    crumbs.splice(1, 1);
  }

  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const crumbs = buildCrumbs(pathname);
  const current = crumbs[crumbs.length - 1];

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-foreground shadow-sm transition hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className={cn("inline-flex items-center rounded-xl border border-slate-200 bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-foreground transition hover:bg-slate-100 sm:hidden", focusRingLight)}
        >
          Voltar
        </button>

        <ol className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
          {crumbs.map((c, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <li key={c.href} className="flex min-w-0 items-center gap-2">
                {isLast ? (
                  <span className="min-w-0 truncate text-foreground">{c.label}</span>
                ) : (
                  <Link
                    href={c.href}
                    className={cn("min-w-0 truncate rounded-md px-1 py-0.5 hover:bg-slate-100", focusRingLight)}
                  >
                    {c.label}
                  </Link>
                )}
                {isLast ? null : <span className="text-slate-400">/</span>}
              </li>
            );
          })}
        </ol>

        <div className="min-w-0 truncate text-sm text-foreground sm:hidden">
          {current?.label ?? "—"}
        </div>
      </div>
    </nav>
  );
}
