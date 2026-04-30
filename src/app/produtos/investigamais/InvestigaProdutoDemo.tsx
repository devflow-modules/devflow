"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Activity,
  MapPin,
  History,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trackOpenDemo, trackTryProduct } from "@/lib/analytics";
import {
  demoAssistPanelClass,
  demoCardClass,
  demoCtaPrimaryClass,
  demoCtaSecondaryClass,
  demoEyebrowClass,
  demoSuccessPanelClass,
} from "@/components/demo/demoUi";
import {
  getInvestigaDemoSample,
  INVESTIGA_DEMO_CNPJ_DISPLAY,
} from "@/modules/produto-demos/investigaDemo";
import type { CnpjDemoShape } from "@/modules/produto-demos/types";

const HISTORY_KEY = "devflow_investiga_demo_history_v1";
const HISTORY_MAX = 3;

const INVESTIGA_PLUS_URL = "https://investigamais.com.br";

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, HISTORY_MAX)
      : [];
  } catch {
    return [];
  }
}

function pushHistory(label: string): void {
  if (typeof window === "undefined") return;
  const prev = readHistory().filter((x) => x !== label);
  const next = [label, ...prev].slice(0, HISTORY_MAX);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function InvestigaProdutoDemo() {
  const [sample, setSample] = useState<CnpjDemoShape | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Hidratação: servidor e primeiro paint no cliente ficam alinhados; depois lemos localStorage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init one-time a partir de localStorage pós-mount
    setHistory(readHistory());
  }, []);

  const showIllustrative = useCallback(() => {
    trackOpenDemo({ product: "investigamais", surface: "illustrative_card" });
    const s = getInvestigaDemoSample();
    setSample(s);
    pushHistory(s.company_name);
    setHistory(readHistory());
  }, []);

  const onTryConsulta = useCallback(() => {
    trackTryProduct({
      product: "investigamais",
      surface: "cta_consulta_publica",
      destination: "/ferramentas/consulta-cnpj",
      cta_variant: "primary",
    });
  }, []);

  const onTryInvestiga = useCallback(() => {
    trackTryProduct({
      product: "investigamais",
      surface: "cta_investigamais_com",
      destination: INVESTIGA_PLUS_URL,
      cta_variant: "secondary",
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <div className={cn(demoCardClass(), "text-left")}>
        <span className={demoEyebrowClass}>
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Demo · 1 clique
        </span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Mostre o resultado antes de falar de planilha
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Conteúdo{" "}
          <strong className="font-medium text-foreground">ilustrativo e seguro</strong> para
          apresentação — sem depender da Receita Federal nesta tela.
        </p>
        <p className="mt-2 font-mono text-xs text-foreground sm:text-sm">
          CNPJ fictício na narrativa: {INVESTIGA_DEMO_CNPJ_DISPLAY}
        </p>

        <Button
          type="button"
          variant="primary"
          onClick={showIllustrative}
          className={cn(demoCtaPrimaryClass, "mt-6")}
        >
          <Sparkles className="size-4" aria-hidden />
          Ver resultado ilustrativo
        </Button>

        {!sample && (
          <div
            className="mt-8 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center sm:px-6"
            aria-live="polite"
          >
            <p className="text-sm font-medium text-foreground">Nenhum resultado ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Toque no botão acima para preencher a ficha de exemplo — leva menos de um segundo.
            </p>
          </div>
        )}

        {sample && (
          <div className={cn(demoSuccessPanelClass, "mt-8")} role="status">
            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
              Resultado demonstrativo — não é consulta em tempo real.
            </p>
            <div className="mt-4 flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-5" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Razão social
                  </span>
                </div>
                <p className="mt-1 text-lg font-semibold text-foreground">{sample.company_name}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">Situação</span>
                  </div>
                  <p className="mt-1 text-foreground">{sample.status}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">Abertura</span>
                  </div>
                  <p className="mt-1 text-foreground">{sample.opening_date}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-4" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Atividade principal
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">{sample.main_activity}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wider">Endereço</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{sample.address}</p>
              </div>
            </div>
          </div>
        )}

        <div className={cn(demoCardClass("mt-8 bg-muted/15 shadow-none"), "border-dashed")}>
          <div className="flex items-start gap-3">
            <History className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                No Investiga+: histórico que vende
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Consultas salvas por equipe, reconsulta rápida e contexto para decisão — sem colar
                print em planilha.
              </p>
              {history.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-foreground" role="list">
                  {history.map((name) => (
                    <li key={name} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                      {name}
                    </li>
                  ))}
                </ul>
              )}
              {history.length === 0 && sample === null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Depois do exemplo, guardamos até três nomes neste navegador para simular o
                  benefício de histórico.
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Próximo passo comercial:</span> valide na
          Receita com um CNPJ público já pré-preenchido na ferramenta grátis, ou leve o cliente ao
          produto completo.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/ferramentas/consulta-cnpj?prefill=demo"
            onClick={onTryConsulta}
            className={cn(demoCtaPrimaryClass, "sm:flex-initial")}
          >
            Consultar na Receita (grátis)
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a
            href={INVESTIGA_PLUS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onTryInvestiga}
            className={cn(demoCtaSecondaryClass, "sm:flex-initial")}
          >
            Abrir Investiga+
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>

        <div className={cn(demoAssistPanelClass, "mt-6 flex items-start gap-2")}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            A ferramenta pública consulta a Receita; esta página prioriza exemplo estável para
            demo com cliente.
          </span>
        </div>
      </div>
    </div>
  );
}
