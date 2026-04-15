"use client";

import { useState } from "react";
import { Button } from "@devflow/ui";

type Props = {
  open: boolean;
  channelLabel: string;
  onClose: () => void;
  onSubmit: (accessToken: string) => Promise<void>;
};

export function ActivateChannelModal({ open, channelLabel, onClose, onSubmit }: Props) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = token.trim();
    if (t.length < 10) return;
    setBusy(true);
    try {
      await onSubmit(t);
      setToken("");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Fechar"
        onClick={() => !busy && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activate-channel-title"
        className="relative z-[301] w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="activate-channel-title" className="df-text-section-title text-slate-900">
          Ativar canal
        </h2>
        <p className="df-text-muted mt-1 text-sm">{channelLabel}</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="df-label">Access token (Meta)</span>
            <textarea
              value={token}
              onChange={(ev) => setToken(ev.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Cole o token de acesso…"
              disabled={busy}
              autoComplete="off"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => !busy && onClose()} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={busy || token.trim().length < 10}>
              {busy ? "A validar…" : "Ativar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
