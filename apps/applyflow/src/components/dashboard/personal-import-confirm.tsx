"use client";

import { useState } from "react";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY } from "@/lib/local-contact-storage";
import { APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY } from "@/lib/local-inbound-response-storage";
import { APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY } from "@/lib/local-resume-library-storage";

function readLegacy(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function PersonalImportConfirm({ accountId }: { accountId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const visibleId = accountId.length <= 8 ? accountId : `${accountId.slice(0, 4)}…${accountId.slice(-4)}`;

  async function importLegacy() {
    setPending(true);
    setStatus(null);
    const legacyBefore = window.localStorage.getItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY);
    try {
      const profileDoc = readLegacy(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY) as { library?: unknown } | null;
      const contactsDoc = readLegacy(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY) as {
        contacts?: unknown[];
        interactions?: unknown[];
      } | null;
      const responsesDoc = readLegacy(APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY) as { detections?: unknown[] } | null;
      const calls: Array<{ module: string; body: Record<string, unknown> }> = [];
      if (profileDoc?.library) calls.push({ module: "profile", body: { profile: profileDoc.library } });
      if (contactsDoc?.contacts?.length) {
        calls.push({
          module: "contacts",
          body: { contacts: contactsDoc.contacts, interactions: contactsDoc.interactions ?? [] },
        });
      }
      if (responsesDoc?.detections?.length) {
        calls.push({ module: "responses", body: { responses: responsesDoc.detections } });
      }
      if (calls.length === 0) {
        setStatus("Não há dados locais legados para importar.");
        return;
      }
      for (const call of calls) {
        const response = await fetch("/api/applyflow/v2/personal-import", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ module: call.module, confirmImport: true, ...call.body }),
        });
        const body = (await response.json()) as { accountId?: string; status?: string; error?: string };
        if (body.accountId && body.accountId !== accountId) {
          setStatus("A conta de destino não confere. Nada mais foi importado.");
          return;
        }
        if (!response.ok) {
          setStatus(body.status === "conflict" ? "Conflito com dados já existentes na conta." : "A importação não foi concluída.");
          return;
        }
      }
      if (window.localStorage.getItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY) !== legacyBefore) {
        setStatus("A cópia local foi alterada. Recarregue antes de tentar de novo.");
        return;
      }
      setStatus("Importação concluída para esta conta. Os dados locais originais foram mantidos.");
    } catch {
      setStatus("Falha de rede. A cópia local não foi usada como gravação da conta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-[color:var(--af-border)] pt-4">
      <h2 className="text-sm font-semibold text-[color:var(--af-text)]">Importar dados locais</h2>
      <p className="text-sm text-[color:var(--af-text-muted)]">
        Destino: conta <span data-testid="personal-import-account">{visibleId}</span>. A cópia neste navegador
        permanece até você apagá-la.
      </p>
      <label className="flex items-start gap-2 text-sm text-[color:var(--af-text)]">
        <input
          data-testid="personal-import-confirm"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Confirmo a importação para esta conta.
      </label>
      <ApplyFlowButton
        type="button"
        data-testid="personal-import-submit"
        disabled={!confirmed || pending}
        onClick={() => void importLegacy()}
      >
        Importar para esta conta
      </ApplyFlowButton>
      {status ? <p className="text-sm text-[color:var(--af-text-muted)]">{status}</p> : null}
    </section>
  );
}
