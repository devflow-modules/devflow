"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  commandPaletteRoutes,
  PALETTE_GROUP_LABEL,
  PALETTE_GROUP_ORDER,
  type CommandPaletteRoute,
  type PaletteGroupId,
} from "@/lib/navigation/nav-matrix";
import { useSessionRole } from "./SessionRoleContext";
import { useSupport } from "@/components/support/SupportProvider";
import { Button } from "@/components/ui/button";

function matchesQuery(route: CommandPaletteRoute, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const blob = [route.label, route.href, ...route.aliases, route.groupLabel].join(" ").toLowerCase();
  return blob.includes(s);
}

type QuickAction = {
  id: string;
  label: string;
  aliases: string[];
  run: () => void;
};

/**
 * Comando rápido: ⌘K / Ctrl+K — rotas por palavras-chave (PT) + ação de suporte.
 */
export function NavCommandPalette() {
  const router = useRouter();
  const { role } = useSessionRole();
  const { openSupport } = useSupport();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const routes = useMemo(() => commandPaletteRoutes(role), [role]);

  const quickActions = useMemo((): QuickAction[] => {
    return [
      {
        id: "support",
        label: "Pedir ajuda (suporte)",
        aliases: ["ajuda", "suporte", "help", "ticket", "contacto", "contactar"],
        run: () => {
          openSupport();
          setOpen(false);
          setQ("");
        },
      },
    ];
  }, [openSupport]);

  const filteredActions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return quickActions;
    return quickActions.filter((a) => {
      const blob = [a.label, ...a.aliases].join(" ").toLowerCase();
      return blob.includes(s);
    });
  }, [q, quickActions]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => matchesQuery(r, q));
  }, [routes, q]);

  const grouped = useMemo(() => {
    const byId = new Map<PaletteGroupId, CommandPaletteRoute[]>();
    for (const r of filteredRoutes) {
      const arr = byId.get(r.groupId) ?? [];
      arr.push(r);
      byId.set(r.groupId, arr);
    }
    return PALETTE_GROUP_ORDER.map((id) => ({
      id,
      label: PALETTE_GROUP_LABEL[id],
      items: byId.get(id) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filteredRoutes]);

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

  const showActions = filteredActions.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]">
      <Button variant="ghost"
        type="button"
        className="absolute inset-0 bg-muted/40 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/90 bg-card shadow-2xl ring-1 ring-slate-900/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-cmd-title"
      >
        <div className="border-b border-border px-4 py-3">
          <p id="nav-cmd-title" className="text-xs font-semibold uppercase tracking-wide df-text-muted">
            Ir para…
          </p>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: inbox, equipe, plano, ajuda…"
            className="mt-2 w-full rounded-lg border border-border bg-muted/60/80 px-3 py-2 text-sm df-text-primary outline-none ring-[var(--df-brand-500)] placeholder:df-text-muted focus:border-[var(--df-brand-400)] focus:bg-card focus:ring-2"
          />
          <p className="mt-2 text-[11px] df-text-muted">⌘K ou Ctrl+K · Esc para fechar</p>
        </div>
        <div className="max-h-[min(50vh,420px)] overflow-y-auto py-2">
          {showActions ? (
            <div className="mb-2 border-b border-border pb-2">
              <p className="sticky top-0 z-[1] bg-card/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider df-text-muted backdrop-blur-sm">
                Ação rápida
              </p>
              <ul className="space-y-0.5">
                {filteredActions.map((a) => (
                  <li key={a.id}>
                    <Button variant="ghost"
                      type="button"
                      onClick={a.run}
                      className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--df-brand-50)]"
                    >
                      <span className="font-medium df-text-primary">{a.label}</span>
                      <span className="text-[11px] df-text-muted">Abre o formulário de suporte</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {grouped.length === 0 && !showActions ? (
            <p className="px-4 py-6 text-center text-sm df-text-muted">Nenhum destino corresponde.</p>
          ) : (
            grouped.map((g) => (
              <div key={g.id} className="mb-2 last:mb-0">
                <p className="sticky top-0 z-[1] bg-card/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider df-text-muted backdrop-blur-sm">
                  {g.label}
                </p>
                <ul className="space-y-0.5">
                  {g.items.map((r) => (
                    <li key={r.href}>
                      <Button variant="secondary"
                        type="button"
                        onClick={() => onNavigate(r.href)}
                        className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--df-brand-50)]"
                      >
                        <span className="font-medium df-text-primary">{r.label}</span>
                      </Button>
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
