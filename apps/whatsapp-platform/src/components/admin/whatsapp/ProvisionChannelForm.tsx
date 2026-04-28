"use client";

import { useState } from "react";
import { Button } from "@devflow/ui";
import type { AdminTenantOption } from "./types";

type Props = {
  tenants: AdminTenantOption[];
  onProvisioned: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  fetchProvision: (body: {
    tenantId: string;
    phone: string;
    wabaId: string;
    phoneNumberId: string;
  }) => Promise<Response>;
};

export function ProvisionChannelForm({
  tenants,
  onProvisioned,
  onError,
  onSuccess,
  fetchProvision,
}: Props) {
  const [tenantId, setTenantId] = useState("");
  const [phone, setPhone] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const tid = tenantId.trim();
    if (!tid || !phone.trim() || !wabaId.trim() || !phoneNumberId.trim()) {
      onError("Preencha todos os campos.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetchProvision({
        tenantId: tid,
        phone: phone.trim(),
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
      });
      const body = (await res.json()) as {
        success?: boolean;
        error?: { code?: string; message?: string };
        data?: { channelId?: string };
      };
      if (!res.ok || !body.success) {
        const msg =
          body.error && typeof body.error === "object" && typeof body.error.message === "string"
            ? body.error.message
            : "Não foi possível provisionar o canal.";
        onError(msg);
        return;
      }
      onSuccess("Canal criado. Estado: pendente de ativação.");
      setPhone("");
      setWabaId("");
      setPhoneNumberId("");
      onProvisioned();
    } catch {
      onError("Erro de rede. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="df-surface space-y-4 rounded-xl p-5 shadow-sm">
      <h2 className="df-text-section-title text-[var(--df-text-primary)]">Provisionar canal (manual)</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="df-label">Tenant</span>
          <select
            value={tenantId}
            onChange={(ev) => setTenantId(ev.target.value)}
            className="mt-1 w-full rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)]"
            disabled={busy}
            data-testid="provision-tenant-select"
          >
            <option value="">— Selecionar —</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {(t.name?.trim() || t.id) + ` (${t.id.slice(0, 8)}…)`}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="df-label">Telefone (E.164)</span>
          <input
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            className="mt-1 w-full rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm font-mono text-[var(--df-text-primary)]"
            placeholder="+5511999990000"
            disabled={busy}
            data-testid="provision-phone"
          />
        </label>
        <label className="block">
          <span className="df-label">WABA ID</span>
          <input
            value={wabaId}
            onChange={(ev) => setWabaId(ev.target.value)}
            className="mt-1 w-full rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm font-mono text-[var(--df-text-primary)]"
            disabled={busy}
            data-testid="provision-waba"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="df-label">Phone Number ID</span>
          <input
            value={phoneNumberId}
            onChange={(ev) => setPhoneNumberId(ev.target.value)}
            className="mt-1 w-full rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm font-mono text-[var(--df-text-primary)]"
            disabled={busy}
            data-testid="provision-phone-number-id"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="default" disabled={busy}>
          {busy ? "A criar…" : "Provisionar canal"}
        </Button>
      </div>
    </form>
  );
}
