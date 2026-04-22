"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Section } from "@/components/layout/Section";
import { RelatedLinks } from "@/components/shared/related-links";
import { CrossSellBeyond } from "@/components/sections/cross-sell-beyond";
import {
  Search,
  Building2,
  Calendar,
  Activity,
  MapPin,
  Sparkles,
  Loader2,
} from "lucide-react";
import { trackCtaDemoClick } from "@/lib/analytics";
import {
  demoCardClass,
  demoCtaPrimaryClass,
  demoCtaSecondaryClass,
  demoEyebrowClass,
} from "@/components/demo/demoUi";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";
import { CONSULTA_PREFILL_DEMO_DISPLAY } from "@/modules/produto-demos/investigaDemo";
import {
  PRIMARY_DEMO_HREF,
  SPECIALIST_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";

type CnpjData = {
  company_name: string;
  status: string;
  opening_date: string;
  main_activity: string;
  address: string;
};

function formatCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function ConsultaCnpjPage() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<CnpjData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("prefill") === "demo") {
      setInput(CONSULTA_PREFILL_DEMO_DISPLAY);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cnpj = input.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      setError("Informe um CNPJ válido com 14 dígitos.");
      setData(null);
      return;
    }
    setError(null);
    setData(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/cnpj/${cnpj}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível consultar o CNPJ.");
        return;
      }
      setData(json);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const showEmptyHint = !loading && !error && !data;

  return (
    <div className="min-h-screen">
      <Section aria-label="Consulta CNPJ">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Consulta CNPJ
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Consulte dados públicos de empresas de forma rápida e organizada.
          </p>
          <Link
            href="/ferramentas"
            className="mt-6 inline-flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline"
          >
            ← Voltar ao hub de ferramentas
          </Link>

          <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 sm:p-5">
            <div className={cn(demoEyebrowClass, "mb-2 bg-background/60 text-muted-foreground")}>
              <Sparkles className="size-3.5 text-muted-foreground" aria-hidden />
              Exemplo de uso
            </div>
            <p className="text-sm font-medium text-foreground">
              Veja como consultas podem ser usadas em um fluxo maior de análise.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ilustração para contexto; a consulta abaixo usa dados reais da Receita Federal.
            </p>
            <Link
              href={PRIMARY_DEMO_HREF}
              onClick={() => trackCtaDemoClick("consulta_cnpj_context_banner")}
              className={cn(
                demoCtaSecondaryClass,
                "mt-4 text-xs font-medium sm:text-sm"
              )}
            >
              <Sparkles className="size-4 shrink-0" aria-hidden />
              Ver demo
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 max-w-xl"
          aria-busy={loading}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label htmlFor="cnpj-input" className="sr-only">
              CNPJ
            </label>
            <input
              id="cnpj-input"
              type="text"
              inputMode="numeric"
              placeholder="00.000.000/0001-00"
              value={input}
              onChange={(e) => setInput(formatCnpjInput(e.target.value))}
              disabled={loading}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading}
              className={cn(demoCtaPrimaryClass, "min-w-[140px] sm:w-auto")}
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  <span>Consultando…</span>
                </>
              ) : (
                <>
                  <Search className="size-5" aria-hidden />
                  Consultar
                </>
              )}
            </button>
          </div>
        </form>

        {showEmptyHint && (
          <p
            className="mx-auto mt-6 max-w-xl text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            Digite um CNPJ válido para visualizar os dados.
          </p>
        )}

        {error && (
          <div
            className="mx-auto mt-6 max-w-xl rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/15"
            role="alert"
          >
            {error}
          </div>
        )}

        {data && (
          <div className="mx-auto mt-10 max-w-2xl">
            <div className={demoCardClass()} role="status">
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="size-5" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Razão social / Nome fantasia
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {data.company_name || "—"}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="size-4" aria-hidden />
                      <span className="text-xs font-medium uppercase tracking-wider">Situação</span>
                    </div>
                    <p className="mt-1 text-foreground">{data.status || "—"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-4" aria-hidden />
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Data de abertura
                      </span>
                    </div>
                    <p className="mt-1 text-foreground">{data.opening_date || "—"}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Atividade principal
                    </span>
                  </div>
                  <p className="mt-1 text-foreground">{data.main_activity || "—"}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">Endereço</span>
                  </div>
                  <p className="mt-1 text-foreground">{data.address || "—"}</p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  Agora imagine isso rodando automaticamente no seu atendimento
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Consultas como essa podem ser integradas ao seu fluxo de atendimento no WhatsApp.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
                  <Link
                    href={PRIMARY_DEMO_HREF}
                    onClick={() => trackCtaDemoClick("consulta_cnpj_result_ver_demo")}
                    className={cn(demoCtaPrimaryClass, "w-full sm:w-auto")}
                  >
                    Ver demo
                  </Link>
                  <WhatsAppCta
                    label={SPECIALIST_WHATSAPP_CTA_LABEL}
                    ariaLabel="Falar com especialista no WhatsApp"
                    size="default"
                    text="Quero entender como integrar consultas e dados ao meu atendimento no WhatsApp."
                    className="w-full sm:w-auto sm:min-w-[12rem] justify-center"
                  />
                </div>
                <p className="mt-4 text-center sm:text-left">
                  <Link
                    href="/produtos/whatsapp-platform"
                    onClick={() => trackCtaDemoClick("consulta_cnpj_result_produto")}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Ver produto completo
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section aria-label="Quer ir além — outros produtos DevFlow">
        <div className="mx-auto max-w-4xl">
          <CrossSellBeyond />
        </div>
      </Section>

      <Section>
        <RelatedLinks variant="ferramentas" title="Explore o ecossistema" />
      </Section>
    </div>
  );
}
