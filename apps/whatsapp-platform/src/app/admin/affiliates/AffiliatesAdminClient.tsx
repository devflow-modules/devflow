"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buildAffiliateSignupLink } from "@/modules/affiliates/affiliateSignupLink";

type AffiliateRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commissionRate: number;
  createdAt: string;
  clientCount: number;
  totalEarned: number;
  pendingTotal: number;
  paidTotal: number;
};

type CommissionRow = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  implantationPriceBrl: number | null;
  affiliateCommissionRate: number;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
};

type CommissionFilter = "all" | "pendente" | "pago";

type ApiSuccess<T> = { success: true; data: T; error: null; trace_id: string };
type ApiErr = { success: false; data: null; error: { code: string; message: string }; trace_id: string };

function formatBrl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatPct(rate: number) {
  return `${Math.round(rate * 1000) / 10}%`;
}

function truncateSignupUrl(url: string, max = 52): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

export function AffiliatesAdminClient({
  initialAffiliates,
  publicSignupBaseUrl,
}: {
  initialAffiliates: AffiliateRow[];
  /** Base pública (ex.: NEXT_PUBLIC_WHATSAPP_APP_URL); vazio usa path relativo no link. */
  publicSignupBaseUrl: string;
}) {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>(initialAffiliates);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commissionsByAffiliate, setCommissionsByAffiliate] = useState<Record<string, CommissionRow[]>>({});
  const [loadingCommissions, setLoadingCommissions] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [commissionRate, setCommissionRate] = useState("0.5");
  const [commissionFilter, setCommissionFilter] = useState<CommissionFilter>("all");
  const [copyNoticeAffiliateId, setCopyNoticeAffiliateId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyReferralLink = useCallback(
    async (affiliateId: string) => {
      const url = buildAffiliateSignupLink(affiliateId, publicSignupBaseUrl || undefined);
      try {
        await navigator.clipboard.writeText(url);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        setCopyNoticeAffiliateId(affiliateId);
        copyTimer.current = setTimeout(() => setCopyNoticeAffiliateId(null), 2800);
      } catch {
        window.prompt("Copie o link:", url);
      }
    },
    [publicSignupBaseUrl]
  );

  const openReferralLink = useCallback(
    (affiliateId: string) => {
      const url = buildAffiliateSignupLink(affiliateId, publicSignupBaseUrl || undefined);
      const abs = url.startsWith("http") ? url : `${typeof window !== "undefined" ? window.location.origin : ""}${url}`;
      window.open(abs, "_blank", "noopener,noreferrer");
    },
    [publicSignupBaseUrl]
  );

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/admin/affiliates", { credentials: "include" });
    const body = (await res.json()) as ApiSuccess<{ affiliates: AffiliateRow[] }> | ApiErr;
    if (!res.ok || !body.success) {
      return;
    }
    const next = body.data.affiliates.map((a) => ({
      ...a,
      createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date(a.createdAt as unknown as Date).toISOString(),
    }));
    setAffiliates(next);
  }, []);

  const loadCommissions = useCallback(async (affiliateId: string) => {
    setLoadingCommissions(affiliateId);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/commissions`, { credentials: "include" });
      const body = (await res.json()) as ApiSuccess<{ commissions: CommissionRow[] }> | ApiErr;
      if (res.ok && body.success) {
        const mapped = body.data.commissions.map((c) => ({
          ...c,
          createdAt:
            typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt as unknown as Date).toISOString(),
        }));
        setCommissionsByAffiliate((prev) => ({ ...prev, [affiliateId]: mapped }));
      }
    } finally {
      setLoadingCommissions(null);
    }
  }, []);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setCommissionFilter("all");
    setExpandedId(id);
    if (!commissionsByAffiliate[id]) {
      await loadCommissions(id);
    }
  };

  const markPaid = async (commissionId: string, affiliateId: string) => {
    setPayingId(commissionId);
    try {
      const res = await fetch(`/api/admin/commissions/${commissionId}/pay`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pago" }),
      });
      if (res.ok) {
        await loadCommissions(affiliateId);
        await refreshList();
      }
    } finally {
      setPayingId(null);
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const rate = Number.parseFloat(commissionRate.replace(",", "."));
    if (!name.trim() || !Number.isFinite(rate) || rate < 0 || rate > 1) {
      setCreateError("Nome obrigatório e taxa entre 0 e 1 (ex.: 0,5 para 50%).");
      return;
    }
    setCreateBusy(true);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          commissionRate: rate,
        }),
      });
      const body = (await res.json()) as ApiErr | ApiSuccess<unknown>;
      if (!res.ok || !body.success) {
        setCreateError(!body.success ? body.error.message : "Falha ao criar.");
        return;
      }
      setName("");
      setEmail("");
      setCommissionRate("0.5");
      await refreshList();
    } finally {
      setCreateBusy(false);
    }
  };

  const baseHint = useMemo(
    () =>
      "Comissão = valor de implantação do cliente (`implantationPriceBrl` no tenant) × taxa do afiliado. Só é gerada em IMPLANTADO e com valor definido. O env `AFFILIATE_IMPLANTATION_BASE_BRL` é só referência de mercado na UI — não entra no cálculo.",
    []
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plataforma</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Afiliados</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{baseHint}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/tenants" className="font-medium text-slate-600 underline-offset-4 hover:underline">
            Tenants
          </Link>
          <Link href="/admin/billing" className="font-medium text-slate-600 underline-offset-4 hover:underline">
            Faturação
          </Link>
          <Link href="/admin/metrics" className="font-medium text-slate-600 underline-offset-4 hover:underline">
            Métricas
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Novo afiliado</h2>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[180px] flex-1 text-xs text-slate-600">
            Nome
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="Distribuidora X"
            />
          </label>
          <label className="block min-w-[200px] flex-1 text-xs text-slate-600">
            E-mail (opcional)
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </label>
          <label className="block w-32 text-xs text-slate-600">
            Taxa (0–1)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              value={commissionRate}
              onChange={(ev) => setCommissionRate(ev.target.value)}
              placeholder="0.5"
            />
          </label>
          <button
            type="submit"
            disabled={createBusy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {createBusy ? "A guardar…" : "Criar"}
          </button>
        </form>
        {createError ? <p className="mt-2 text-sm text-red-600">{createError}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Resumo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Afiliado</th>
                <th className="px-4 py-3">Taxa</th>
                <th className="px-4 py-3 text-right">Clientes</th>
                <th className="px-4 py-3 text-right">Total movimentado</th>
                <th className="px-4 py-3 text-right">Pendente</th>
                <th className="px-4 py-3 text-right">Pago</th>
                <th className="px-4 py-3">Indicação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {affiliates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Sem afiliados. Crie o primeiro acima.
                  </td>
                </tr>
              ) : (
                affiliates.map((a) => (
                  <Fragment key={a.id}>
                    <tr className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{a.name}</div>
                        {a.email ? <div className="text-xs text-slate-500">{a.email}</div> : null}
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">{a.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatPct(a.commissionRate)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">{a.clientCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">{formatBrl(a.totalEarned)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-800">{formatBrl(a.pendingTotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-800">{formatBrl(a.paidTotal)}</td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[220px] flex-col gap-1.5">
                          <p className="text-[11px] leading-snug text-slate-500">Use este link para indicar clientes</p>
                          <p
                            className="break-all font-mono text-[10px] leading-tight text-slate-400"
                            title={buildAffiliateSignupLink(a.id, publicSignupBaseUrl || undefined)}
                          >
                            {truncateSignupUrl(buildAffiliateSignupLink(a.id, publicSignupBaseUrl || undefined))}
                          </p>
                          <button
                            type="button"
                            data-testid={`copy-ref-link-${a.id}`}
                            onClick={() => void copyReferralLink(a.id)}
                            className="w-max rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                          >
                            {copyNoticeAffiliateId === a.id
                              ? "Link de indicação copiado"
                              : "Copiar link de indicação"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openReferralLink(a.id)}
                            className="w-max text-xs font-medium text-blue-700 underline-offset-4 hover:underline"
                          >
                            Abrir signup
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void toggleExpand(a.id)}
                          className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                        >
                          {expandedId === a.id ? "Fechar" : "Comissões"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === a.id ? (
                      <tr className="bg-slate-50/50">
                        <td colSpan={8} className="px-4 py-4">
                          {loadingCommissions === a.id ? (
                            <p className="text-sm text-slate-500">A carregar comissões…</p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {(["all", "pendente", "pago"] as const).map((f) => (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() => setCommissionFilter(f)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                      commissionFilter === f
                                        ? "bg-slate-900 text-white"
                                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    {f === "all" ? "Todas" : f === "pendente" ? "Pendentes" : "Pagas"}
                                  </button>
                                ))}
                              </div>
                              <ul className="space-y-2">
                                {(commissionsByAffiliate[a.id] ?? [])
                                  .filter((c) => commissionFilter === "all" || c.status === commissionFilter)
                                  .map((c) => (
                                    <li
                                      key={c.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                              c.status === "pago"
                                                ? "bg-emerald-100 text-emerald-900"
                                                : "bg-amber-100 text-amber-900"
                                            }`}
                                          >
                                            {c.status === "pago" ? "Pago" : "Pendente"}
                                          </span>
                                          <span className="font-medium text-slate-900">{formatBrl(c.amount)}</span>
                                          <span className="text-slate-500">comissão</span>
                                        </div>
                                        <div className="mt-1 text-xs text-slate-600">
                                          Implantação:{" "}
                                          {c.implantationPriceBrl != null && c.implantationPriceBrl > 0
                                            ? formatBrl(c.implantationPriceBrl)
                                            : "—"}{" "}
                                          · Taxa aplicada: {formatPct(c.affiliateCommissionRate)} · {c.type}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                          <span>
                                            {c.tenantName ?? c.tenantId} · {new Date(c.createdAt).toLocaleString("pt-BR")}
                                          </span>
                                          <Link
                                            href={`/admin/tenants/${c.tenantId}`}
                                            className="font-medium text-blue-700 underline-offset-4 hover:underline"
                                          >
                                            Ver tenant
                                          </Link>
                                        </div>
                                      </div>
                                      {c.status === "pendente" ? (
                                        <button
                                          type="button"
                                          disabled={payingId === c.id}
                                          onClick={() => void markPaid(c.id, a.id)}
                                          className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                          {payingId === c.id ? "…" : "Marcar como pago"}
                                        </button>
                                      ) : null}
                                    </li>
                                  ))}
                                {(commissionsByAffiliate[a.id] ?? []).length === 0 ? (
                                  <li className="text-sm text-slate-500">Nenhuma comissão registada.</li>
                                ) : (commissionsByAffiliate[a.id] ?? []).filter(
                                    (c) => commissionFilter === "all" || c.status === commissionFilter
                                  ).length === 0 ? (
                                  <li className="text-sm text-slate-500">Nenhuma comissão neste filtro.</li>
                                ) : null}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        APIs: <code className="rounded bg-slate-100 px-1">POST/GET /api/admin/affiliates</code>,{" "}
        <code className="rounded bg-slate-100 px-1">PATCH /api/admin/tenants/:id/affiliate</code>,{" "}
        <code className="rounded bg-slate-100 px-1">PATCH /api/admin/tenants/:id</code> (implantação),{" "}
        <code className="rounded bg-slate-100 px-1">PATCH /api/admin/tenants/:id/gtm-lifecycle</code>,{" "}
        <code className="rounded bg-slate-100 px-1">PATCH /api/admin/commissions/:id/pay</code>.
      </p>
    </div>
  );
}
