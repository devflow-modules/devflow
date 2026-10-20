import { useCallback, useEffect, useState } from "react";
import type { Contact, ContactInteraction } from "@devflow/applyflow-core";

import { ExtensionButton } from "../../components/ExtensionButton.js";

type CloudStatus =
  | { kind: "loading" }
  | { kind: "signed_out"; message: string }
  | { kind: "capability_denied"; message: string }
  | { kind: "read_only"; message: string }
  | { kind: "paused"; message: string }
  | { kind: "ready"; accountId: string; scopes: string[] }
  | { kind: "error"; message: string };

type OpState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "confirmed"; detail: string }
  | { kind: "conflict"; detail: string }
  | { kind: "network"; detail: string }
  | { kind: "error"; detail: string };

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sendRuntimeMessage<T>(message: unknown): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        void chrome.runtime.lastError;
        resolve(response as T | undefined);
      });
    } catch {
      resolve(undefined);
    }
  });
}

export function PanelContactsSection() {
  const [status, setStatus] = useState<CloudStatus>({ kind: "loading" });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("recruiter");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [op, setOp] = useState<OpState>({ kind: "idle" });

  const refresh = useCallback(async () => {
    setStatus({ kind: "loading" });
    const account = await sendRuntimeMessage<{
      signedIn?: boolean;
      accountId?: string | null;
      scopes?: string[];
    }>({ type: "APPLYFLOW_ACCOUNT_STATUS" });

    if (!account?.signedIn || !account.accountId) {
      setStatus({
        kind: "signed_out",
        message: "Sem grant. Abra /account, confirme permissões e ligue a extensão.",
      });
      setContacts([]);
      return;
    }

    const scopes = account.scopes ?? [];
    if (!scopes.includes("contacts:read")) {
      setStatus({
        kind: "capability_denied",
        message: "Grant sem contacts:read. Reconecte e confirme contactos.",
      });
      setContacts([]);
      return;
    }

    const listed = await sendRuntimeMessage<{
      ok?: boolean;
      error?: string;
      status?: number;
      contacts?: Contact[];
      versions?: Record<string, number>;
      reconnect?: string;
    }>({ type: "APPLYFLOW_LIST_CLOUD_CONTACTS" });

    if (!listed?.ok) {
      if (listed?.status === 401 || listed?.error === "signed_out") {
        setStatus({
          kind: "signed_out",
          message: listed.reconnect ?? "Grant inválido ou revogado.",
        });
        return;
      }
      if (listed?.status === 403 || listed?.error === "grant_capability_denied") {
        setStatus({
          kind: "capability_denied",
          message: listed.reconnect ?? "Sem permissão de contactos neste grant.",
        });
        return;
      }
      if (listed?.error === "persistence_v2_paused" || listed?.status === 503) {
        setStatus({ kind: "paused", message: "Conta em pausa. Escrita e leitura cloud indisponíveis." });
        return;
      }
      if (listed?.error === "persistence_v2_read_only") {
        setStatus({
          kind: "read_only",
          message: "Conta só de leitura. Pode ver contactos se o grant permitir; edição bloqueada.",
        });
      } else {
        setStatus({
          kind: "error",
          message: listed?.error ?? "Não foi possível carregar contactos da conta.",
        });
        return;
      }
    }

    setContacts(listed.contacts ?? []);
    setVersions(listed.versions ?? {});
    if (listed?.error === "persistence_v2_read_only") {
      setStatus({ kind: "read_only", message: "Conta só de leitura." });
      return;
    }
    setStatus({ kind: "ready", accountId: account.accountId, scopes });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function beginEdit(contact: Contact) {
    setEditingId(contact.id);
    setName(contact.name);
    setRelation(contact.type);
    setLinkedinUrl(contact.linkedinUrl ?? "");
    setNotes(contact.notes ?? "");
    setOp({ kind: "idle" });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setRelation("recruiter");
    setLinkedinUrl("");
    setNotes("");
  }

  async function onSaveContact() {
    if (status.kind !== "ready") return;
    if (!status.scopes.includes("contacts:write")) {
      setOp({
        kind: "error",
        detail: "Grant sem contacts:write. Reconecte com essa permissão.",
      });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setOp({ kind: "error", detail: "Nome é obrigatório." });
      return;
    }

    const now = new Date().toISOString();
    const id = editingId ?? newId("extcontact");
    const previous = contacts.find((item) => item.id === id);
    const contact: Contact = {
      id,
      name: trimmed,
      type: relation as Contact["type"],
      status: previous?.status ?? "not_contacted",
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      ...(linkedinUrl.trim() ? { linkedinUrl: linkedinUrl.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    setOp({ kind: "saving" });
    const expectedVersion = editingId ? versions[editingId] : undefined;
    const result = await sendRuntimeMessage<{
      ok?: boolean;
      error?: string;
      status?: number;
      contact?: Contact;
      version?: number;
      reused?: boolean;
      reconnect?: string;
    }>({
      type: "APPLYFLOW_SAVE_CLOUD_CONTACT",
      contact,
      expectedVersion,
    });

    if (result?.ok && result.contact && typeof result.version === "number") {
      setContacts((current) => {
        const without = current.filter((item) => item.id !== result.contact!.id);
        return [...without, result.contact!];
      });
      setVersions((current) => ({ ...current, [result.contact!.id]: result.version! }));
      setOp({
        kind: "confirmed",
        detail: result.reused
          ? "Confirmado no servidor (retry idempotente)."
          : "Contacto gravado na conta (confirmado pelo servidor).",
      });
      resetForm();
      return;
    }

    if (result?.status === 409 || result?.error === "version_conflict") {
      setOp({
        kind: "conflict",
        detail: "Conflito de versão. Recarregue os contactos; o servidor prevalece.",
      });
      await refresh();
      return;
    }
    if (result?.error === "aborted") {
      setOp({
        kind: "error",
        detail: "Operação cancelada (troca de conta). Não confirmada.",
      });
      return;
    }
    if (result?.error === "network" || result?.status === 0) {
      setOp({
        kind: "network",
        detail: "Falha de rede. Não treatado como sucesso — tente de novo com o mesmo id.",
      });
      return;
    }
    if (result?.error === "grant_capability_denied" || result?.status === 403) {
      setOp({
        kind: "error",
        detail: result.reconnect ?? "Sem permissão de escrita de contactos.",
      });
      return;
    }
    if (result?.error === "persistence_v2_paused" || result?.status === 503) {
      setStatus({ kind: "paused", message: "Conta em pausa." });
      setOp({ kind: "error", detail: "Gates em pausa — escrita negada." });
      return;
    }
    if (result?.error === "persistence_v2_read_only") {
      setStatus({ kind: "read_only", message: "Conta só de leitura." });
      setOp({ kind: "error", detail: "Modo só de leitura — edição negada." });
      return;
    }
    setOp({
      kind: "error",
      detail: result?.error ?? "Gravação não confirmada pelo servidor.",
    });
  }

  async function onRegisterInteraction(contact: Contact) {
    if (status.kind !== "ready") return;
    if (!status.scopes.includes("contacts:write")) {
      setOp({ kind: "error", detail: "Grant sem contacts:write." });
      return;
    }
    const confirmed = window.confirm(
      `Registar interação manual «note» para ${contact.name}? Nenhum mensagem será enviada.`,
    );
    if (!confirmed) return;

    const interaction: ContactInteraction = {
      id: newId("extinteraction"),
      contactId: contact.id,
      type: "note",
      occurredAt: new Date().toISOString(),
      content: "Interação registada manualmente na extensão (sem envio automático).",
    };

    setOp({ kind: "saving" });
    const result = await sendRuntimeMessage<{
      ok?: boolean;
      error?: string;
      status?: number;
      interaction?: ContactInteraction;
      reused?: boolean;
      reconnect?: string;
    }>({
      type: "APPLYFLOW_SAVE_CLOUD_INTERACTION",
      interaction,
    });

    if (result?.ok) {
      setOp({
        kind: "confirmed",
        detail: result.reused
          ? "Interação já confirmada no servidor (retry)."
          : "Interação registada na conta (confirmada pelo servidor).",
      });
      return;
    }
    if (result?.status === 409) {
      setOp({ kind: "conflict", detail: "Conflito na interação. Recarregue e revise." });
      return;
    }
    if (result?.error === "aborted") {
      setOp({
        kind: "error",
        detail: "Operação cancelada (troca de conta). Não confirmada.",
      });
      return;
    }
    if (result?.error === "network" || result?.status === 0) {
      setOp({
        kind: "network",
        detail: "Falha de rede após tentativa. Não confirmado — retry com o mesmo id.",
      });
      return;
    }
    setOp({
      kind: "error",
      detail: result?.reconnect ?? result?.error ?? "Interação não confirmada.",
    });
  }

  const canWrite =
    status.kind === "ready" && status.scopes.includes("contacts:write");

  return (
    <section className="af-panel-section" data-testid="panel-contacts-section">
      <div className="af-panel-section-head">
        <h2 className="af-panel-section-title">Contactos da conta</h2>
        <ExtensionButton type="button" className="af-btn-secondary" onClick={() => void refresh()}>
          Actualizar
        </ExtensionButton>
      </div>

      {status.kind === "loading" ? (
        <p className="af-muted">A carregar estado da conta…</p>
      ) : null}
      {status.kind === "signed_out" ||
      status.kind === "capability_denied" ||
      status.kind === "paused" ||
      status.kind === "read_only" ||
      status.kind === "error" ? (
        <p className="af-muted" role="status">
          {"message" in status ? status.message : "Estado indisponível."}
        </p>
      ) : null}
      {status.kind === "ready" ? (
        <p className="af-muted">
          Conta ligada. Confirmação só após resposta do servidor. Sem envio automático de mensagens.
        </p>
      ) : null}

      {canWrite ? (
        <div className="af-stack" style={{ gap: "6px", marginTop: "8px" }}>
          <label className="af-muted">
            Nome
            <input
              data-testid="panel-contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label className="af-muted">
            Relação
            <select
              data-testid="panel-contact-relation"
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
              style={{ width: "100%" }}
            >
              <option value="recruiter">Recruiter</option>
              <option value="hiring_manager">Hiring Manager</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="af-muted">
            LinkedIn URL
            <input
              data-testid="panel-contact-linkedin"
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label className="af-muted">
            Nota
            <textarea
              data-testid="panel-contact-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              style={{ width: "100%" }}
            />
          </label>
          <ExtensionButton
            type="button"
            data-testid="panel-contact-save"
            disabled={op.kind === "saving"}
            onClick={() => void onSaveContact()}
          >
            {editingId ? "Actualizar contacto" : "Criar contacto"}
          </ExtensionButton>
        </div>
      ) : null}

      {op.kind !== "idle" ? (
        <p
          className="af-muted"
          role="status"
          data-testid="panel-contact-op-status"
          style={{ marginTop: "6px" }}
        >
          {op.kind === "saving"
            ? "A gravar… à espera da confirmação do servidor."
            : op.detail}
        </p>
      ) : null}

      <ul className="af-stack" style={{ marginTop: "10px", gap: "8px" }} data-testid="panel-contact-list">
        {contacts.map((contact) => (
          <li key={contact.id} className="af-panel-card">
            <p>
              <strong>{contact.name}</strong> · {contact.type}
            </p>
            {contact.linkedinUrl ? <p className="af-muted">{contact.linkedinUrl}</p> : null}
            {contact.notes ? <p className="af-muted">{contact.notes}</p> : null}
            <div className="af-action-row" style={{ marginTop: "4px" }}>
              {canWrite ? (
                <>
                  <ExtensionButton
                    type="button"
                    className="af-btn-secondary"
                    onClick={() => beginEdit(contact)}
                  >
                    Editar
                  </ExtensionButton>
                  <ExtensionButton
                    type="button"
                    className="af-btn-secondary"
                    data-testid={`panel-contact-interaction-${contact.id}`}
                    onClick={() => void onRegisterInteraction(contact)}
                  >
                    Registar interação
                  </ExtensionButton>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
