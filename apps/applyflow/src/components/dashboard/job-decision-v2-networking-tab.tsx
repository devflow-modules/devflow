"use client";

import { useMemo, useState } from "react";

import { ApplyFlowBadge, type ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  archiveDashboardOutreach,
  saveDashboardOutreach,
  type ApplicationOutreachScope,
} from "@/lib/local-contact-storage";
import {
  computeOutreachMetrics,
  effectiveOutreachStatus,
  markOutreachSent,
  normalizeOutreachStatus,
  recordOutreachReply,
  updateOutreachContact,
  validateOutreachProfileUrl,
  type Contact,
  type ContactType,
  type NetworkingPlan,
  type OutreachChannel,
  type OutreachLanguage,
  type OutreachStatus,
} from "@devflow/applyflow-core";

type OutreachDraft = {
  name: string;
  role: string;
  company: string;
  type: ContactType;
  channel: OutreachChannel;
  language: OutreachLanguage;
  linkedinUrl: string;
  email: string;
  status: OutreachStatus;
  subject: string;
  messageContent: string;
  followUpAt: string;
  notes: string;
  inMailCreditConsumed: boolean;
  inMailCredits: string;
};

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  recruiter: "Recruiter",
  talent_partner: "Talent Partner",
  hiring_manager: "Hiring Manager",
  engineering_leader: "Engineering Leader",
  engineer: "Engineer",
  referral: "Referral",
  engineering_manager: "Engineering Manager",
  head_of_engineering: "Head of Engineering",
  cto: "CTO",
  founder: "Founder",
  employee: "Employee",
  other: "Other",
};

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  linkedin: "LinkedIn",
  linkedin_inmail: "LinkedIn InMail",
  email: "Email",
  whatsapp: "WhatsApp",
  referral: "Referral",
  other: "Other",
};

const STATUS_LABELS: Record<OutreachStatus, string> = {
  IDENTIFIED: "Identificado",
  MESSAGE_PREPARED: "Preparada",
  SENT: "Enviada",
  REPLIED: "Respondida",
  FOLLOW_UP_DUE: "Follow-up pendente",
  CONVERSATION: "Em conversa",
  CLOSED: "Encerrada",
};
const EDITABLE_OUTREACH_STATUSES = [
  "IDENTIFIED",
  "MESSAGE_PREPARED",
  "SENT",
  "REPLIED",
  "CONVERSATION",
  "CLOSED",
] as const satisfies readonly OutreachStatus[];

function emptyDraft(company: string): OutreachDraft {
  return {
    name: "",
    role: "",
    company,
    type: "recruiter",
    channel: "linkedin",
    language: "EN",
    linkedinUrl: "",
    email: "",
    status: "IDENTIFIED",
    subject: "",
    messageContent: "",
    followUpAt: "",
    notes: "",
    inMailCreditConsumed: false,
    inMailCredits: "1",
  };
}

function toLocalDateTime(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function draftFrom(contact: Contact): OutreachDraft {
  const status = normalizeOutreachStatus(contact.status);
  return {
    name: contact.name,
    role: contact.role ?? "",
    company: contact.company ?? "",
    type: contact.type,
    channel: contact.channel ?? "linkedin",
    language: contact.language ?? "EN",
    linkedinUrl: contact.linkedinUrl ?? "",
    email: contact.email ?? "",
    status: status === "FOLLOW_UP_DUE" ? "SENT" : status,
    subject: contact.subject ?? "",
    messageContent: contact.messageContent ?? "",
    followUpAt: toLocalDateTime(contact.followUpAt ?? contact.nextActionAt),
    notes: contact.notes ?? "",
    inMailCreditConsumed: contact.inMailCreditConsumed ?? false,
    inMailCredits: String(contact.inMailCredits ?? 1),
  };
}

function statusTone(status: OutreachStatus): ApplyFlowBadgeTone {
  if (status === "REPLIED" || status === "CONVERSATION") return "success";
  if (status === "SENT") return "brand";
  if (status === "FOLLOW_UP_DUE") return "warning";
  if (status === "CLOSED") return "neutral";
  return "intel";
}

function formatDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function newId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

export function JobDecisionV2NetworkingTab({
  applicationId,
  jobId,
  company,
  contacts,
  networkingPlan,
  onPersist,
}: {
  applicationId?: string;
  jobId: string;
  company?: string;
  contacts: Contact[];
  networkingPlan?: NetworkingPlan;
  onPersist: () => void;
}) {
  const activeContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          !contact.archivedAt &&
          (applicationId
            ? contact.applicationId === applicationId || (!contact.applicationId && contact.jobId === jobId)
            : !contact.applicationId && contact.jobId === jobId),
      ),
    [applicationId, contacts, jobId],
  );
  const metrics = computeOutreachMetrics(activeContacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(company ?? ""));
  const [error, setError] = useState<string | null>(null);

  const scope: ApplicationOutreachScope | null = applicationId ? { applicationId, jobId } : null;

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft(company ?? ""));
    setError(null);
  }

  function persist(contact: Contact, interaction?: Parameters<typeof saveDashboardOutreach>[2]): boolean {
    if (!scope) return false;
    const result = saveDashboardOutreach(scope, contact, interaction);
    if (!result.ok) {
      setError(
        result.error === "outreach_scope_mismatch"
          ? "Este contato pertence a outra candidatura."
          : "Revise os campos do contato antes de guardar.",
      );
      return false;
    }
    setError(null);
    onPersist();
    return true;
  }

  function contactInScope(contact: Contact): Contact {
    if (!scope) return contact;
    return {
      ...contact,
      applicationId: scope.applicationId,
      jobId: scope.jobId,
    };
  }

  function saveDraft() {
    if (!scope || !draft.name.trim()) {
      setError("Nome e candidatura são obrigatórios.");
      return;
    }
    if (!validateOutreachProfileUrl(draft.linkedinUrl, draft.channel)) {
      setError("Use uma URL HTTPS válida; para LinkedIn, use linkedin.com.");
      return;
    }
    const current = activeContacts.find((contact) => contact.id === editingId);
    const now = new Date();
    const base: Contact =
      current ?? {
        id: newId("contact"),
        applicationId,
        jobId,
        name: draft.name.trim(),
        type: draft.type,
        status: "IDENTIFIED",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    let next = updateOutreachContact(
      { ...base, applicationId, jobId },
      {
        name: draft.name,
        role: draft.role,
        company: draft.company || company,
        type: draft.type,
        channel: draft.channel,
        language: draft.language,
        linkedinUrl: draft.linkedinUrl,
        email: draft.email,
        status: draft.status,
        subject: draft.subject,
        messageContent: draft.messageContent,
        followUpAt: toIsoDateTime(draft.followUpAt),
        notes: draft.notes,
        inMailCreditConsumed:
          draft.channel === "linkedin_inmail" ? draft.inMailCreditConsumed : false,
        inMailCredits:
          draft.channel === "linkedin_inmail" && draft.inMailCreditConsumed
            ? Math.max(1, Number.parseInt(draft.inMailCredits, 10) || 1)
            : 0,
      },
      now,
    );
    let interaction: Parameters<typeof saveDashboardOutreach>[2];
    if (draft.status === "SENT" && !next.sentAt) {
      const sent = markOutreachSent(next, {
        content: next.messageContent,
        subject: next.subject,
        followUpAt: next.followUpAt,
        interactionId: newId("interaction"),
      }, now);
      next = sent.contact;
      interaction = sent.interaction;
    } else if (
      (draft.status === "REPLIED" || draft.status === "CONVERSATION") &&
      !next.repliedAt
    ) {
      if (!next.sentAt) {
        next.sentAt = now.toISOString();
      }
      const replied = recordOutreachReply(next, { interactionId: newId("interaction") }, now);
      next = {
        ...replied.contact,
        status: draft.status,
      };
      interaction = replied.interaction;
    }
    if (persist(next, interaction)) resetForm();
  }

  function markPrepared(contact: Contact) {
    persist(updateOutreachContact(contactInScope(contact), { status: "MESSAGE_PREPARED" }));
  }

  function markSent(contact: Contact) {
    const scopedContact = contactInScope(contact);
    const result = markOutreachSent(
      scopedContact,
      {
        content: scopedContact.messageContent,
        subject: scopedContact.subject,
        followUpAt: scopedContact.followUpAt,
        interactionId: `interaction-${scopedContact.id}-sent`,
      },
    );
    persist(result.contact, result.interaction);
  }

  function markReply(contact: Contact) {
    const scopedContact = contactInScope(contact);
    const replySource = scopedContact.sentAt
      ? scopedContact
      : { ...scopedContact, sentAt: new Date().toISOString() };
    const result = recordOutreachReply(replySource, {
      interactionId: `interaction-${scopedContact.id}-reply`,
    });
    persist(result.contact, result.interaction);
  }

  function archive(contact: Contact) {
    if (!scope) return;
    const result = archiveDashboardOutreach(scope, contact.id);
    if (!result.ok) {
      setError("Não foi possível arquivar este contato.");
      return;
    }
    if (editingId === contact.id) resetForm();
    onPersist();
  }

  return (
    <div className="grid gap-4">
      <ApplyFlowCard padding="md">
        <p className="text-xs text-[color:var(--af-text-muted)]">
          Tracking manual. O ApplyFlow não envia mensagens nem acessa o LinkedIn.
        </p>
        <p className="mt-2 text-sm text-[color:var(--af-text)]">
          Primeiro contato: {networkingPlan?.firstContact ?? "—"}
        </p>
        <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{networkingPlan?.reason}</p>
        {networkingPlan?.connectionRequest ? (
          <p className="mt-3 text-sm text-[color:var(--af-text)]">{networkingPlan.connectionRequest}</p>
        ) : null}
      </ApplyFlowCard>

      <ApplyFlowCard padding="md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Networking / Outreach
          </p>
          <span className="text-xs text-[color:var(--af-text-muted)]">
            {activeContacts.length} {activeContacts.length === 1 ? "contato" : "contatos"}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
          <p>Enviados: {metrics.sent}</p>
          <p>Respostas: {metrics.replied}</p>
          <p>Follow-ups: {metrics.followUpsPending}</p>
          <p>Response rate: {Math.round(metrics.responseRate * 100)}%</p>
        </div>
        {!scope ? (
          <p className="mt-4 text-sm text-amber-200">
            Registe a candidatura antes de adicionar contatos de outreach.
          </p>
        ) : null}
        {error ? <p role="alert" className="mt-3 text-sm text-red-200">{error}</p> : null}
        <ul className="mt-4 grid gap-3">
          {activeContacts.map((contact) => {
            const status = effectiveOutreachStatus(contact);
            const sentDate = formatDate(contact.sentAt);
            const profileUrl =
              contact.linkedinUrl &&
              validateOutreachProfileUrl(contact.linkedinUrl, contact.channel ?? "linkedin")
                ? contact.linkedinUrl
                : undefined;
            return (
              <li key={contact.id} className="rounded-lg border border-[color:var(--af-border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <ApplyFlowBadge tone={statusTone(status)}>{STATUS_LABELS[status]}</ApplyFlowBadge>
                    <p className="mt-2 font-medium text-[color:var(--af-text)]">{contact.name}</p>
                    <p className="text-xs text-[color:var(--af-text-muted)]">
                      {[contact.role, contact.company ?? company].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="text-xs text-[color:var(--af-text-muted)]">
                    {CHANNEL_LABELS[contact.channel ?? "linkedin"]} · {contact.language ?? "EN"}
                  </p>
                </div>
                {sentDate ? <p className="mt-2 text-xs">Enviado em {sentDate}</p> : null}
                {contact.channel === "linkedin_inmail" && contact.inMailCreditConsumed ? (
                  <p className="mt-1 text-xs">
                    {contact.inMailCredits ?? 1} LinkedIn InMail credit
                  </p>
                ) : null}
                {contact.notes ? <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{contact.notes}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={() => {
                    setEditingId(contact.id);
                    setDraft(draftFrom(contact));
                    setError(null);
                  }}>
                    Editar
                  </ApplyFlowButton>
                  {status === "IDENTIFIED" ? (
                    <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={() => markPrepared(contact)}>
                      Marcar preparada
                    </ApplyFlowButton>
                  ) : null}
                  {status === "MESSAGE_PREPARED" || status === "IDENTIFIED" ? (
                    <ApplyFlowButton type="button" variant="outlineBrand" size="sm" onClick={() => markSent(contact)}>
                      Marcar enviada
                    </ApplyFlowButton>
                  ) : null}
                  {status === "SENT" || status === "FOLLOW_UP_DUE" ? (
                    <ApplyFlowButton type="button" variant="outlineBrand" size="sm" onClick={() => markReply(contact)}>
                      Registrar resposta
                    </ApplyFlowButton>
                  ) : null}
                  {profileUrl ? (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md px-2 py-1 text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      Abrir perfil
                    </a>
                  ) : null}
                  <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={() => archive(contact)}>
                    Arquivar
                  </ApplyFlowButton>
                </div>
              </li>
            );
          })}
        </ul>
      </ApplyFlowCard>

      {scope ? (
        <ApplyFlowCard padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            {editingId ? "Editar contato" : "Adicionar contato"}
          </p>
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveDraft();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs">
                Nome
                <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Cargo / headline
                <input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Empresa
                <input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Tipo
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ContactType })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                  {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                Canal
                <select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value as OutreachChannel })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                  {Object.entries(CHANNEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                Idioma
                <select value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value as OutreachLanguage })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                  {["PT", "EN", "ES", "Other"].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                LinkedIn / profile URL
                <input type="url" value={draft.linkedinUrl} onChange={(event) => setDraft({ ...draft, linkedinUrl: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Email opcional
                <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Status
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OutreachStatus })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                  {EDITABLE_OUTREACH_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                Follow-up
                <input type="datetime-local" value={draft.followUpAt} onChange={(event) => setDraft({ ...draft, followUpAt: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
              </label>
            </div>
            <label className="grid gap-1 text-xs">
              Subject
              <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              Mensagem / draft
              <textarea rows={4} value={draft.messageContent} onChange={(event) => setDraft({ ...draft, messageContent: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              Notas
              <textarea rows={2} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
            </label>
            {draft.channel === "linkedin_inmail" ? (
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={draft.inMailCreditConsumed} onChange={(event) => setDraft({ ...draft, inMailCreditConsumed: event.target.checked })} />
                  Consumiu crédito
                </label>
                {draft.inMailCreditConsumed ? (
                  <label className="grid gap-1 text-xs">
                    Créditos
                    <input type="number" min="1" value={draft.inMailCredits} onChange={(event) => setDraft({ ...draft, inMailCredits: event.target.value })} className="w-24 rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
                  </label>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <ApplyFlowButton type="submit" variant="outlineBrand" size="sm">
                {editingId ? "Guardar alterações" : "Adicionar contato"}
              </ApplyFlowButton>
              {editingId ? (
                <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={resetForm}>
                  Cancelar
                </ApplyFlowButton>
              ) : null}
            </div>
          </form>
        </ApplyFlowCard>
      ) : null}
    </div>
  );
}
