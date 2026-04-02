"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { CONTEXT_LABELS } from "@/modules/financeiro/schemas";
import { expenseCreateSchema } from "@/modules/financeiro/schemas";
import {
  apiErrorMessageAmigavel,
  linhaAcertoHumana,
  linhaSugestaoHumana,
  CONFIRMA_ESTORNO,
  CONFIRMA_QUITADO,
  CONFIRMA_FECHAR_MES,
  MICRO_CONFIANCA,
  INTRO_CONTA,
} from "../contaHumanCopy";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type Participant = {
  id: string;
  name: string;
  defaultShare: number;
  userId?: string | null;
};

type ExpenseSplit = {
  participantId: string;
  participant: { name: string };
  amount: number;
};

type Expense = {
  id: string;
  category: string;
  amount: number;
  dueDate: string;
  status: string;
  expenseSplitType: string;
  paidByParticipantId: string | null;
  paidByParticipant: { name: string } | null;
  splits: ExpenseSplit[];
};

type Account = {
  id: string;
  name: string;
  type: string;
  participants: Participant[];
  expenses: Expense[];
};

type SettlementItem = {
  id: string;
  fromParticipantId: string;
  toParticipantId: string;
  fromName: string;
  toName: string;
  amount: number;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "COMPLETED";
  completedAt: string | null;
  reopenedAt?: string | null;
  createdAt: string;
};

type SuggestedTransfer = { from: string; to: string; amount: number };

type PaymentItem = {
  id: string;
  settlementId: string;
  amount: number;
  reversedTotal: number;
  netAmount: number;
  createdAt: string;
  fromName: string;
  toName: string;
  fromParticipantId: string;
  toParticipantId: string;
};

type TimelineEvent = {
  type: string;
  at: string;
  id: string;
  label?: string;
  amount?: number;
  fromName?: string;
  toName?: string;
  settlementId?: string;
};

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params?.accountId as string;
  const { household, isLoading: householdLoading } = useHousehold();
  const [account, setAccount] = useState<Account | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [suggested, setSuggested] = useState<SuggestedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [liquidating, setLiquidating] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseType, setExpenseType] = useState<"SHARED" | "INDIVIDUAL">("SHARED");
  const [expenseParticipantId, setExpenseParticipantId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Outros");
  const [expenseDueDate, setExpenseDueDate] = useState("");
  const [expensePaid, setExpensePaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [participantShare, setParticipantShare] = useState("0.5");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showManualSettlement, setShowManualSettlement] = useState(false);
  const [manualFromId, setManualFromId] = useState("");
  const [manualToId, setManualToId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [closeMonthInput, setCloseMonthInput] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [closingMonth, setClosingMonth] = useState(false);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [meUserId, setMeUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((p) => setMeUserId(p?.data?.user?.id ?? null))
      .catch(() => setMeUserId(null));
  }, []);

  const loadAccount = async () => {
    if (!accountId || !household?.id) return;
    const res = await fetch(`/api/accounts/${accountId}`);
    const payload = await res.json();
    if (payload.success && payload.data) {
      const acc = payload.data;
      setAccount({
        ...acc,
        participants: (acc.participants ?? []).map((p: Participant & { defaultShare: unknown; userId?: unknown }) => ({
          ...p,
          defaultShare: Number(p.defaultShare),
          userId: (p.userId as string) ?? null,
        })),
        expenses: (acc.expenses ?? []).map((e: Expense & { amount: unknown }) => ({
          ...e,
          amount: Number(e.amount),
          splits: (e.splits ?? []).map((s: ExpenseSplit & { amount: unknown }) => ({
            ...s,
            amount: Number(s.amount),
          })),
        })),
      });
    }
  };

  const loadBalances = async () => {
    if (!accountId) return;
    const [rawRes, effectiveRes] = await Promise.all([
      fetch(`/api/accounts/${accountId}/balances`),
      fetch(`/api/accounts/${accountId}/effective-balances`),
    ]);
    const rawPayload = await rawRes.json();
    const effectivePayload = await effectiveRes.json();
    if (effectivePayload.success && effectivePayload.data) setBalances(effectivePayload.data);
    else if (rawPayload.success && rawPayload.data) setBalances(rawPayload.data);
  };

  const loadSettlements = async () => {
    if (!accountId) return;
    const res = await fetch(`/api/accounts/${accountId}/settlements`);
    const payload = await res.json();
    if (payload.success && Array.isArray(payload.data)) setSettlements(payload.data);
  };

  const loadSuggested = async () => {
    if (!accountId) return;
    const res = await fetch(`/api/accounts/${accountId}/settlements/suggested`);
    const payload = await res.json();
    if (payload.success && Array.isArray(payload.data)) setSuggested(payload.data);
  };

  const loadPayments = async () => {
    if (!accountId) return;
    const res = await fetch(`/api/accounts/${accountId}/payments`);
    const payload = await res.json();
    if (payload.success && Array.isArray(payload.data)) {
      setPayments(
        payload.data.map((p: PaymentItem & { reversedTotal?: number; netAmount?: number }) => ({
          ...p,
          reversedTotal: Number(p.reversedTotal ?? 0),
          netAmount: Number(p.netAmount ?? p.amount),
          fromParticipantId: p.fromParticipantId ?? "",
          toParticipantId: p.toParticipantId ?? "",
        }))
      );
    }
  };

  const loadTimeline = async () => {
    if (!accountId) return;
    const res = await fetch(`/api/accounts/${accountId}/timeline`);
    const payload = await res.json();
    if (payload.success && Array.isArray(payload.data)) setTimeline(payload.data);
  };

  const refreshDebts = () => {
    loadSettlements();
    loadSuggested();
    loadBalances();
    loadPayments();
    loadTimeline();
  };

  useEffect(() => {
    if (!accountId || !household?.id) return;
    setLoading(true);
    Promise.all([
      loadAccount(),
      loadBalances(),
      loadSettlements(),
      loadSuggested(),
      loadPayments(),
      loadTimeline(),
    ]).finally(() => setLoading(false));
    // Carrega quando mudam conta/casa; funções locais não entram nas deps para evitar reexecução em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + accountId/household
  }, [accountId, household?.id]);

  const handleLiquidarTudo = async () => {
    if (!accountId) return;
    setLiquidating(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: newIdempotencyKey() }),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Acertos registrados. Agora você pode ir pagando aos poucos.");
        refreshDebts();
      } else toast.error(apiErrorMessageAmigavel(payload));
    } finally {
      setLiquidating(false);
    }
  };

  const handleMarkPaid = async (settlementId: string) => {
    if (typeof window !== "undefined" && !window.confirm(CONFIRMA_QUITADO)) return;
    setCompletingId(settlementId);
    try {
      const res = await fetch(`/api/settlements/${settlementId}/complete`, { method: "PATCH" });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Acerto marcado como totalmente pago.");
        refreshDebts();
      } else toast.error(apiErrorMessageAmigavel(payload));
    } finally {
      setCompletingId(null);
    }
  };

  const handleRegisterPayment = async (e: FormEvent, settlementId: string) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor positivo");
      return;
    }
    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/settlements/${settlementId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, idempotencyKey: newIdempotencyKey() }),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Pagamento registrado. Falta pagar foi atualizado.");
        setShowPaymentModal(null);
        setPaymentAmount("");
        refreshDebts();
      } else {
        toast.error(apiErrorMessageAmigavel(payload));
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleManualSettlement = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(manualAmount);
    if (!manualFromId || !manualToId || Number.isNaN(amount) || amount <= 0) {
      toast.error("Preencha quem pagou, quem recebeu e o valor");
      return;
    }
    if (manualFromId === manualToId) {
      toast.error("Quem pagou e quem recebeu devem ser diferentes");
      return;
    }
    setSubmittingManual(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/manual-settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromParticipantId: manualFromId,
          toParticipantId: manualToId,
          amount,
          idempotencyKey: newIdempotencyKey(),
        }),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Acerto manual registrado.");
        setShowManualSettlement(false);
        setManualFromId("");
        setManualToId("");
        setManualAmount("");
        refreshDebts();
      } else toast.error(apiErrorMessageAmigavel(payload));
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleReversePayment = async (paymentId: string) => {
    if (typeof window !== "undefined" && !window.confirm(CONFIRMA_ESTORNO)) return;
    setReversingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: newIdempotencyKey() }),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Estorno feito com sucesso. O histórico foi atualizado.");
        refreshDebts();
      } else toast.error(apiErrorMessageAmigavel(payload));
    } finally {
      setReversingPaymentId(null);
    }
  };

  const handleReopenSettlement = async (settlementId: string) => {
    setReopeningId(settlementId);
    try {
      const res = await fetch(`/api/settlements/${settlementId}/reopen`, { method: "POST" });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Acerto reaberto. Você pode ajustar pagamentos de novo.");
        refreshDebts();
      } else toast.error(apiErrorMessageAmigavel(payload));
    } finally {
      setReopeningId(null);
    }
  };

  const handleFinalizeSettlement = async (settlementId: string) => {
    setReopeningId(settlementId);
    try {
      const res = await fetch(`/api/settlements/${settlementId}/finalize`, { method: "POST" });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Tudo certo — acerto fechado de novo.");
        refreshDebts();
      } else toast.error(apiErrorMessageAmigavel(payload));
    } finally {
      setReopeningId(null);
    }
  };

  const handleCloseMonth = async (e: FormEvent) => {
    e.preventDefault();
    if (!accountId || !/^\d{4}-\d{2}$/.test(closeMonthInput)) {
      toast.error("Use o mês no formato AAAA-MM (ex.: 2026-03)");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(CONFIRMA_FECHAR_MES)) return;
    setClosingMonth(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/close-month`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: closeMonthInput, idempotencyKey: newIdempotencyKey() }),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success(`Mês ${closeMonthInput} guardado. Você pode consultar esse retrato quando quiser.`);
      } else toast.error(apiErrorMessageAmigavel(payload));
    } finally {
      setClosingMonth(false);
    }
  };

  function settlementStatusBadge(s: SettlementItem) {
    if (s.reopenedAt) {
      return (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">Em ajuste</span>
      );
    }
    if (s.status === "PENDING") {
      return (
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">Pendente</span>
      );
    }
    if (s.status === "COMPLETED") {
      return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Pago</span>;
    }
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Parcial</span>;
  }

  function timelineLabel(ev: TimelineEvent): string {
    switch (ev.type) {
      case "expense_created":
        return `Despesa “${ev.label ?? "—"}” · R$ ${(ev.amount ?? 0).toFixed(2)}`;
      case "settlement_created":
        return `Acerto entre ${ev.fromName} e ${ev.toName} · R$ ${(ev.amount ?? 0).toFixed(2)}`;
      case "payment_made":
        return `${ev.fromName} pagou R$ ${(ev.amount ?? 0).toFixed(2)} para ${ev.toName}`;
      case "payment_reversed":
        return `Estorno de R$ ${(ev.amount ?? 0).toFixed(2)} (${ev.fromName} → ${ev.toName})`;
      case "settlement_completed":
        return `Acerto quitado: ${ev.fromName} → ${ev.toName}`;
      default:
        return ev.type;
    }
  }

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    const due = expenseDueDate || new Date().toISOString().slice(0, 10);
    const amount = Number(expenseAmount);
    const parsed = expenseCreateSchema.safeParse({
      category: expenseCategory,
      amount,
      dueDate: due,
      context: account?.type ?? "PERSONAL",
      accountId,
      expenseSplitType: expenseType,
      paidByParticipantId: expenseType === "INDIVIDUAL" ? expenseParticipantId || undefined : undefined,
      ...(expensePaid && { status: "PAID" as const, paidAmount: amount, paidAt: new Date().toISOString().slice(0, 10) }),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Despesa salva.");
        setShowExpenseModal(false);
        setExpenseAmount("");
        setExpenseType("SHARED");
        setExpenseParticipantId("");
        setExpenseCategory("Outros");
        setExpenseDueDate("");
        setExpensePaid(false);
        loadAccount();
        loadBalances();
      } else {
        toast.error(apiErrorMessageAmigavel(payload));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddParticipant = async (e: FormEvent) => {
    e.preventDefault();
    const share = parseFloat(participantShare);
    if (Number.isNaN(share) || share < 0 || share > 1) {
      toast.error("Percentual deve ser entre 0 e 1 (ex: 0.3 = 30%)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: participantName.trim(), defaultShare: share }),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Pessoa adicionada à conta.");
        setShowAddParticipant(false);
        setParticipantName("");
        setParticipantShare("0.5");
        loadAccount();
      } else {
        toast.error(apiErrorMessageAmigavel(payload));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (householdLoading || !household) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (loading && !account) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Carregando dados da conta…</p>
        <Skeleton className="mt-2 h-8 w-48" />
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <p className="text-slate-600">Não achamos essa conta.</p>
        <Link href={`${FINANCEIRO_BASE_PATH}/contas`} className="mt-2 text-primary underline">
          Voltar para suas contas
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <Breadcrumbs />
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{account.name}</h1>
          <p className="text-sm text-slate-500">{CONTEXT_LABELS[account.type as keyof typeof CONTEXT_LABELS]}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowExpenseModal(true)}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Nova despesa
        </button>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">{INTRO_CONTA}</p>
      <p className="mt-2 text-xs text-slate-500">{MICRO_CONFIANCA}</p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Saldo atual (por pessoa)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Positivo = a pessoa pagou mais do que “sua parte”; negativo = ainda deve. Depois dos acertos já feitos.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          {Object.entries(balances).map(([name, value]) => (
            <div key={name} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{name}</span>
              <span className={`mt-0.5 block text-lg font-bold tabular-nums ${value >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {value >= 0 ? "+" : ""}R$ {value.toFixed(2)}
              </span>
            </div>
          ))}
          {Object.keys(balances).length === 0 && (
            <p className="text-sm text-slate-600">
              Nenhuma despesa paga nesta conta ainda. Adicione uma despesa e marque “já paguei” para ver os saldos.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Quem precisa pagar quem</h2>
          <button
            type="button"
            onClick={() => setShowManualSettlement(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Acerto manual
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Quem paga, quem recebe e quanto falta — em uma frase só, quando possível.
        </p>
        {(() => {
          const openSettlements = settlements.filter((s) => s.status === "PENDING" || s.status === "PARTIAL");
          const completed = settlements.filter((s) => s.status === "COMPLETED");
          const hasOpen = openSettlements.length > 0;
          const list = hasOpen ? openSettlements : suggested;
          const isSuggested = !hasOpen && suggested.length > 0;
          return (
            <>
              <div className="mt-3 space-y-3">
                {list.length === 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-5 text-center">
                    <p className="font-semibold text-emerald-900">Tudo certo! Ninguém deve nada 🎉</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Quando houver despesas pagas e mais de uma pessoa na conta, os acertos aparecem aqui.
                    </p>
                  </div>
                )}
                {list.map((item, idx) => {
                  const isSettlement = "id" in item && "paidAmount" in item;
                  const total = isSettlement ? item.amount : item.amount;
                  const paid = isSettlement ? (item as SettlementItem).paidAmount : 0;
                  const remaining = total - paid;
                  const status = isSettlement ? (item as SettlementItem).status : null;
                  const st = item as SettlementItem;
                  const sug = item as SuggestedTransfer;
                  const frasePrincipal = isSettlement
                    ? linhaAcertoHumana(
                        st.fromName,
                        st.toName,
                        total,
                        st.fromParticipantId ?? "",
                        st.toParticipantId ?? "",
                        account.participants,
                        meUserId
                      )
                    : linhaSugestaoHumana(sug.from, sug.to, total, account.participants, meUserId);
                  return (
                    <div
                      key={"id" in item ? item.id : `s-${idx}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="max-w-xl text-base font-semibold leading-snug text-slate-900">{frasePrincipal}</p>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          {isSettlement && settlementStatusBadge(item as SettlementItem)}
                          {!isSettlement && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                              Só sugestão
                            </span>
                          )}
                        </div>
                      </div>
                      {isSettlement && (paid > 0 || status === "PARTIAL") ? (
                        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <div className="flex justify-between">
                            <span>Total do acerto</span>
                            <span className="font-medium tabular-nums">R$ {total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Já pago</span>
                            <span className="font-medium tabular-nums text-emerald-700">R$ {paid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                            <span>Falta pagar</span>
                            <span className="tabular-nums text-slate-900">R$ {Math.round(remaining * 100) / 100}</span>
                          </div>
                          {remaining > 0.01 && total > 0 && (
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, (paid / total) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ) : !isSettlement ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Valor sugerido: <span className="font-semibold tabular-nums">R$ {total.toFixed(2)}</span>
                        </p>
                      ) : null}
                      {"id" in item && (status === "PENDING" || status === "PARTIAL") && remaining > 0.01 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPaymentModal(item.id);
                              setPaymentAmount(remaining.toFixed(2));
                            }}
                            className="rounded-lg border-2 border-primary bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            Registrar pagamento
                          </button>
                          <button
                            type="button"
                            disabled={completingId === item.id}
                            onClick={() => handleMarkPaid(item.id)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {completingId === item.id ? "…" : "Marcar tudo como pago"}
                          </button>
                        </div>
                      )}
                      {"id" in item &&
                        isSettlement &&
                        (item as SettlementItem).reopenedAt &&
                        (status === "PARTIAL" || status === "PENDING") && (
                          <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2">
                            <p className="mb-2 text-xs text-violet-900">
                              O valor já está quitado no total. Se não for mudar mais nada, confirme para fechar este acerto.
                            </p>
                            <button
                              type="button"
                              disabled={reopeningId === item.id}
                              onClick={() => handleFinalizeSettlement(item.id)}
                              className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                            >
                              {reopeningId === item.id ? "…" : "Confirmar acerto fechado"}
                            </button>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
              {isSuggested && suggested.length > 0 && (
                <button
                  type="button"
                  disabled={liquidating}
                  onClick={handleLiquidarTudo}
                  className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {liquidating ? "Registrando…" : "Registrar estes acertos na lista"}
                </button>
              )}
              {completed.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-800">Acertos já quitados</h3>
                  <ul className="mt-2 space-y-1.5">
                    {completed.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          {s.fromName} → {s.toName}: R$ {s.amount.toFixed(2)}
                          {settlementStatusBadge(s)}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {s.completedAt
                              ? new Date(s.completedAt).toLocaleDateString("pt-BR")
                              : new Date(s.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                          <button
                            type="button"
                            disabled={reopeningId === s.id}
                            onClick={() => handleReopenSettlement(s.id)}
                            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                          >
                            Reabrir acerto
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {payments.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-800">Pagamentos já registrados</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Cada linha é um pagamento feito de uma pessoa para outra.</p>
                  <ul className="mt-2 space-y-1.5">
                    {payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm text-slate-600 last:border-0"
                      >
                        <div>
                          <span>
                            {p.fromName} → {p.toName}: R$ {p.amount.toFixed(2)}
                          </span>
                          {(p.reversedTotal ?? 0) > 0 && (
                            <span className="ml-2 text-xs text-amber-800">
                              (estornou R$ {(p.reversedTotal ?? 0).toFixed(2)} · efetivo R$ {(p.netAmount ?? p.amount).toFixed(2)})
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                          {(p.netAmount ?? p.amount) > 0.01 && (
                            <button
                              type="button"
                              disabled={reversingPaymentId === p.id}
                              onClick={() => handleReversePayment(p.id)}
                              className="text-xs font-medium text-amber-800 hover:underline disabled:opacity-50"
                            >
                              {reversingPaymentId === p.id ? "…" : "Estornar pagamento"}
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          );
        })()}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Fechar mês</h2>
        <p className="mt-1 text-xs text-slate-600">
          Guardamos um retrato dos saldos daquele mês para você consultar depois. Nada some — despesas e pagamentos continuam iguais.
        </p>
        <form onSubmit={handleCloseMonth} className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Mês (ex.: 2026-03)</label>
            <input
              type="text"
              value={closeMonthInput}
              onChange={(e) => setCloseMonthInput(e.target.value)}
              placeholder="2026-03"
              className="mt-0.5 w-36 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={closingMonth}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {closingMonth ? "Guardando…" : "Fechar este mês"}
          </button>
        </form>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-800">Histórico</h3>
          <p className="mt-0.5 text-xs text-slate-500">Tudo que aconteceu nesta conta, em ordem.</p>
          {timeline.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Nada registrado ainda. Comece adicionando uma despesa.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {timeline.map((ev) => (
                <li key={`${ev.type}-${ev.id}`} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-emerald-600">✔</span>
                  <div>
                    <span>{timelineLabel(ev)}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date(ev.at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Pessoas nesta conta</h2>
          <button
            type="button"
            onClick={() => setShowAddParticipant(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Adicionar pessoa
          </button>
        </div>
        {account.participants.length === 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Adicione cada pessoa que divide gastos aqui. Assim o sistema sabe como dividir e quem acerta com quem.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {account.participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="text-sm text-slate-600">{Math.round(p.defaultShare * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Despesas</h2>
        {account.expenses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Nenhuma despesa ainda. Toque em <strong>Nova despesa</strong> para começar — você pode marcar se já pagou.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {account.expenses.map((exp) => (
              <li key={exp.id} className="py-3 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{exp.category}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(exp.dueDate).toLocaleDateString("pt-BR")} · {exp.expenseSplitType === "INDIVIDUAL" ? `100% ${exp.paidByParticipant?.name ?? "—"}` : "Compartilhada"}
                    </p>
                    {exp.splits?.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        {exp.splits.map((s) => `${s.participant.name}: R$ ${s.amount.toFixed(2)}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-slate-900">R$ {exp.amount.toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal despesa */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Nova despesa</h2>
            <p className="mt-1 text-sm text-slate-500">Você pode corrigir depois se errar algum valor.</p>
            <form onSubmit={handleAddExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Categoria / Título</label>
                <input
                  type="text"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Vencimento</label>
                <input
                  type="date"
                  value={expenseDueDate}
                  onChange={(e) => setExpenseDueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value as "SHARED" | "INDIVIDUAL")}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="SHARED">Compartilhada (proporcional)</option>
                  <option value="INDIVIDUAL">Individual (100% uma pessoa)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="expensePaid"
                  checked={expensePaid}
                  onChange={(e) => setExpensePaid(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="expensePaid" className="text-sm font-medium text-slate-700">
                  Já paguei — entra no saldo de quem pagou
                </label>
              </div>
              {expenseType === "INDIVIDUAL" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Quem pagou (100%)</label>
                  <select
                    value={expenseParticipantId}
                    onChange={(e) => setExpenseParticipantId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Selecione</option>
                    {account.participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !expenseAmount || Number(expenseAmount) <= 0}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal participante */}
      {showAddParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Adicionar participante</h2>
            <form onSubmit={handleAddParticipant} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nome</label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Ex: Gustavo, Alexia"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Parte nas despesas compartilhadas (0,7 = 70%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={participantShare}
                  onChange={(e) => setParticipantShare(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddParticipant(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting || !participantName.trim()} className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? "Adicionando…" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal registrar pagamento (parcial) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Registrar pagamento</h2>
            <p className="mt-1 text-sm text-slate-500">Quanto dessa dívida foi pago agora (pode ser em partes).</p>
            <form onSubmit={(e) => handleRegisterPayment(e, showPaymentModal)} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Valor pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(null); setPaymentAmount(""); }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submittingPayment ? "Salvando…" : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pagamento manual */}
      {showManualSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Acerto manual</h2>
            <p className="mt-1 text-sm text-slate-500">Para quando alguém pagou outra pessoa e você quer registrar fora do automático.</p>
            <form onSubmit={handleManualSettlement} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Quem pagou</label>
                <select
                  value={manualFromId}
                  onChange={(e) => setManualFromId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  {account.participants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Quem recebeu</label>
                <select
                  value={manualToId}
                  onChange={(e) => setManualToId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  {account.participants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowManualSettlement(false); setManualFromId(""); setManualToId(""); setManualAmount(""); }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingManual || !manualFromId || !manualToId || !manualAmount || manualFromId === manualToId}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submittingManual ? "Salvando…" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
