"use client";

import { useState } from "react";
import Link from "next/link";
import { Section } from "@/components/layout/Section";
import { RelatedLinks } from "@/components/shared/related-links";
import { CrossSellBeyond } from "@/components/sections/cross-sell-beyond";
import { Search, Building2, Calendar, Activity, MapPin, ExternalLink } from "lucide-react";

const INVESTIGA_PLUS_URL = "https://investigamais.com.br";

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

  return (
    <div className="min-h-screen">
      <Section aria-label="Consulta CNPJ">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Consulta CNPJ
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Consulte dados públicos de empresas na base da Receita Federal. Informe apenas o CNPJ (com ou sem formatação).
          </p>
          <Link
            href="/ferramentas"
            className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            ← Voltar ao hub de ferramentas
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl">
          <div className="flex flex-col gap-3 sm:flex-row">
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
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-foreground placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              <Search className="size-5" aria-hidden />
              {loading ? "Consultando…" : "Consultar"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {data && (
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="size-5" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">Razão social / Nome fantasia</span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-foreground">{data.company_name || "—"}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Activity className="size-4" aria-hidden />
                      <span className="text-xs font-medium uppercase tracking-wider">Situação</span>
                    </div>
                    <p className="mt-1 text-foreground">{data.status || "—"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="size-4" aria-hidden />
                      <span className="text-xs font-medium uppercase tracking-wider">Data de abertura</span>
                    </div>
                    <p className="mt-1 text-foreground">{data.opening_date || "—"}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Activity className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">Atividade principal</span>
                  </div>
                  <p className="mt-1 text-foreground">{data.main_activity || "—"}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-wider">Endereço</span>
                  </div>
                  <p className="mt-1 text-foreground">{data.address || "—"}</p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  Analyze this company deeper with Investiga+
                </p>
                <a
                  href={INVESTIGA_PLUS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  Abrir Investiga+
                  <ExternalLink className="size-4" aria-hidden />
                </a>
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
