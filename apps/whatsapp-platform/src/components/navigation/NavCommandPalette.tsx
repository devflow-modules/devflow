"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  commandPaletteRoutes,
  PALETTE_GROUP_LABEL,
  PALETTE_GROUP_ORDER,
  type PaletteGroupId,
} from "@/lib/navigation/nav-matrix";
import { useSessionRole } from "./SessionRoleContext";

/**
 * Comando rápido estilo produto premium: ⌘K / Ctrl+K para saltar para uma página.
 */
export function NavCommandPalette() {
  const router = useRouter();
  const { role } = useSessionRole();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const routes = useMemo(() => commandPaletteRoutes(role), [role]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return routes;
    return routes.filter(
      (r) =>
        r.label.toLowerCase().includes(s) ||
        r.groupLabel.toLowerCase().includes(s) ||
        r.href.toLowerCase().includes(s)
    );
  }, [routes, q]);

  const grouped = useMemo(() => {
    const byId = new Map<PaletteGroupId, typeof filtered>();
    for (const r of filtered) {
      const arr = byId.get(r.groupId) ?? [];
      arr.push(r);
      byId.set(r.groupId, arr);
    }
    return PALETTE_GROUP_ORDER.map((id) => ({
      id,
      label: PALETTE_GROUP_LABEL[id],
      items: byId.get(id) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const onNavigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
      setQ("");
    },
    [router]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-cmd-title"
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <p id="nav-cmd-title" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Ir para…
          </p>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por nome da página…"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none ring-[var(--df-brand-500)] placeholder:text-slate-400 focus:border-[var(--df-brand-400)] focus:bg-white focus:ring-2"
          />
          <p className="mt-2 text-[11px] text-slate-400">⌘K ou Ctrl+K para abrir · Esc para fechar</p>
        </div>
        <div className="max-h-[min(50vh,420px)] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum destino corresponde.</p>
          ) : (
            grouped.map((g) => (
              <div key={g.id} className="mb-2 last:mb-0">
                <p className="sticky top-0 z-[1] bg-white/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur-sm">
                  {g.label}
                </p>
                <ul className="space-y-0.5">
                  {g.items.map((r) => (
                    <li key={r.href}>
                      <button
                        type="button"
                        onClick={() => onNavigate(r.href)}
                        className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--df-brand-50)]"
                      >
                        <span className="font-medium text-slate-900">{r.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
