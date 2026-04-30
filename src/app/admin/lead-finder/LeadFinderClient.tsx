"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";

const LEAD_FINDER_ORIGIN = "lead_finder_google_maps";
const CITY_STORAGE_KEY = "leadFinderCity";

const NICHE_PRESETS = [
  "Clínica estética",
  "Imobiliária",
  "Dentista",
  "Contabilidade",
  "Oficina mecânica",
  "Academia",
] as const;

type CreatedLeadPreview = {
  id: string;
  name: string | null;
  company: string | null;
  phone: string;
  createdAt: string;
};

function buildGoogleMapsSearchUrl(segment: string, city: string): string {
  const q = [segment, city].map((s) => s.trim()).filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function waMeDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function LeadFinderClient() {
  const [segment, setSegment] = useState("");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<CreatedLeadPreview[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CITY_STORAGE_KEY);
      if (stored) setCity(stored);
    } catch {
      // ignore
    }
  }, []);

  function persistCity(value: string) {
    setCity(value);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }

  function buscarNoGoogleMaps() {
    const q = [segment, city].map((s) => s.trim()).filter(Boolean).join(" ");
    if (!q) {
      toast.error("Preencha o segmento e/ou a cidade");
      return;
    }
    const url = buildGoogleMapsSearchUrl(segment, city);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function clearFormAndFocusPhone() {
    setName("");
    setPhone("");
    setCompany("");
    queueMicrotask(() => phoneInputRef.current?.focus());
  }

  async function createLead(openWhatsAppAfter: boolean) {
    if (!phone.trim()) {
      setError("Telefone é obrigatório");
      return;
    }
    const digits = waMeDigits(phone);
    if (openWhatsAppAfter && !digits) {
      setError("Telefone inválido para abrir o WhatsApp");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim() || null,
          company: company.trim() || null,
          origin: LEAD_FINDER_ORIGIN,
          status: "novo",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        lead?: CreatedLeadPreview;
      };
      if (!res.ok) {
        setError(data.error ?? `Erro ${res.status}`);
        return;
      }
      if (data.lead) {
        setRecent((r) => [data.lead!, ...r].slice(0, 5));
      }
      clearFormAndFocusPhone();
      toast.success("Lead criado");
      if (openWhatsAppAfter && digits) {
        window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Falha ao criar lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-50">
              <span className="font-semibold">Prospecção interna DevFlow</span>
              <span className="text-amber-900/90 dark:text-amber-100/90">
                {" "}
                — mesmo fluxo que Prospecção DevFlow; não é ferramenta do produto para o teu cliente final.
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Lead Finder</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Maps + cadastro rápido de lead (origem{" "}
              <code className="rounded bg-muted px-1">{LEAD_FINDER_ORIGIN}</code>).
            </p>
          </div>
          <Link
            href="/admin/leads"
            className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ir para Prospecção DevFlow →
          </Link>
        </div>

        <section className="mb-8 rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Search helper</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Abre o Google Maps numa nova aba com a busca combinada (segmento + cidade). Copie nome e telefone dos
            resultados e use o formulário abaixo.
          </p>
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Segmentos rápidos</p>
            <div className="flex flex-wrap gap-1.5">
              {NICHE_PRESETS.map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant="secondary"
                  onClick={() => setSegment(label)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-none hover:bg-muted"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Segmento</span>
              <input
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="ex.: clínica estética"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Cidade</span>
              <input
                value={city}
                onChange={(e) => persistCity(e.target.value)}
                placeholder="ex.: São Paulo"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoComplete="off"
              />
            </label>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={buscarNoGoogleMaps}
            className="mt-4 rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow-none hover:bg-primary/15"
          >
            Buscar no Google Maps
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Registar lead (Prospecção DevFlow)</h2>
          {error ? (
            <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void createLead(false);
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Telefone *</span>
              <input
                ref={phoneInputRef}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoComplete="name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Empresa (opcional)</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoComplete="organization"
              />
            </label>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Origem:</span> {LEAD_FINDER_ORIGIN} (padrão; outras
              origens podem ser adicionadas no futuro)
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? "Salvando…" : "Registar lead"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => void createLead(true)}
                className="rounded-md border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary shadow-none hover:bg-primary/10 disabled:opacity-50"
              >
                Adicionar e abrir WhatsApp
              </Button>
            </div>
          </form>
        </section>

        {recent.length > 0 && (
          <section className="mt-8 rounded-lg border border-dashed border-border bg-muted/20 p-4" aria-label="Últimos criados">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Últimos adicionados (nesta sessão)</h2>
            <ul className="space-y-2 text-sm">
              {recent.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-medium text-foreground">{l.name || "—"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{l.phone}</span>
                  {l.company ? <span className="w-full text-xs text-muted-foreground">{l.company}</span> : null}
                  <span className="w-full text-[10px] text-muted-foreground">{formatWhen(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
