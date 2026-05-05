"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminWhatsappChannelRow } from "./types";
import { WHATSAPP_CHANNEL_PURPOSE_PT } from "@/lib/whatsappChannelPurposeLabels";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

const PURPOSE_VALUES = ["GENERAL", "SUPPORT", "SALES", "PROSPECTING", "FINANCE"] as const;

type AutoReplyMode = "inherit" | "on" | "off";

function autoReplyToMode(v: boolean | null): AutoReplyMode {
  if (v === null || v === undefined) return "inherit";
  return v ? "on" : "off";
}

function modeToAutoReply(m: AutoReplyMode): boolean | null {
  if (m === "inherit") return null;
  return m === "on";
}

type Props = {
  open: boolean;
  row: AdminWhatsappChannelRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ChannelLineConfigDrawer({ open, row, onClose, onSaved }: Props) {
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState<string>("GENERAL");
  const [autoMode, setAutoMode] = useState<AutoReplyMode>("inherit");
  const [aiProfileOverride, setAiProfileOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row || !open) return;
    setLabel(row.label?.trim() ?? "");
    setPurpose(row.purpose || "GENERAL");
    setAutoMode(autoReplyToMode(row.autoReplyEnabled));
    setAiProfileOverride(row.aiProfileOverride?.trim() ?? "");
    setError(null);
  }, [row, open]);

  if (!open || !row) return null;

  const channelRow = row;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetchProtected(`/api/admin/whatsapp/channels/${encodeURIComponent(channelRow.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || null,
          purpose,
          autoReplyEnabled: modeToAutoReply(autoMode),
          aiProfileOverride: aiProfileOverride.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(protectedApiUserMessage(res.status, json as { error?: { message?: string } }));
        return;
      }
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <Button variant="ghost"
        type="button"
        className="absolute inset-0 bg-muted/40"
        aria-label="Fechar"
        onClick={() => !busy && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="channel-config-title"
        className="relative z-[301] max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 id="channel-config-title" className="df-text-section-title df-text-primary">
          Configuração do canal
        </h2>
        <p className="df-text-muted mt-1 text-sm">
          {channelRow.tenantName} · {channelRow.phone} ·{" "}
          <span className="font-mono">{channelRow.phoneNumberId}</span>
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="df-label">Nome interno (opcional)</span>
            <input
              type="text"
              value={label}
              onChange={(ev) => setLabel(ev.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm df-text-primary shadow-sm focus:df-border-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)]/30"
              placeholder="Ex.: Principal, Prospecção"
              disabled={busy}
            />
          </label>

          <label className="block">
            <span className="df-label">Finalidade</span>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-[var(--df-bg-elevated)] px-3 py-2 text-sm df-text-primary"
              disabled={busy}
            >
              {PURPOSE_VALUES.map((pv) => (
                <option key={pv} value={pv}>
                  {WHATSAPP_CHANNEL_PURPOSE_PT[pv] ?? pv}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="df-label">Resposta automática IA</span>
            <select
              value={autoMode}
              onChange={(e) => setAutoMode(e.target.value as AutoReplyMode)}
              className="mt-1 w-full rounded-lg border border-border bg-[var(--df-bg-elevated)] px-3 py-2 text-sm df-text-primary"
              disabled={busy}
            >
              <option value="inherit">Herdar definição do tenant (/settings/ai)</option>
              <option value="on">Activar nesta linha</option>
              <option value="off">Desactivar nesta linha</option>
            </select>
          </label>

          <label className="block">
            <span className="df-label">Contexto / perfil IA por canal (opcional)</span>
            <textarea
              value={aiProfileOverride}
              onChange={(ev) => setAiProfileOverride(ev.target.value)}
              rows={5}
              maxLength={12000}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm df-text-primary shadow-sm focus:df-border-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)]/30"
              placeholder="Instruções adicionais só para esta linha; vazio = só configuração do tenant."
              disabled={busy}
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => !busy && onClose()} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={busy}>
              {busy ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
