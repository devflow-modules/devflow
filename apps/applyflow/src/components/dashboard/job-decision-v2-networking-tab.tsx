"use client";

import { useMemo, useState } from "react";

import { ApplyFlowBadge, type ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { networkingStatusTone } from "@/components/ui/status-tones";
import {
  APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY,
  saveDashboardOutreach,
  type ApplicationOutreachScope,
} from "@/lib/local-contact-storage";
import {
  currentPersonalClientScope,
  isStalePersonalGeneration,
  personalLocalWritesAllowed,
  rememberedContactVersion,
  rememberContactVersion,
  writeAccountScopedCache,
} from "@/lib/persistence-v2/personal/client-scope";
import {
  CONTACT_CONFIDENCE_LABELS,
  CONTACT_TYPE_LABELS,
  NETWORKING_STRATEGY_LABELS,
  canMarkOutreachReady,
  computeOutreachMetrics,
  dismissOutreachFollowUp,
  effectiveOutreachStatus,
  markOutreachReady,
  markOutreachSent,
  normalizeOutreachStatus,
  recordOutreachReply,
  scheduleOutreachFollowUp,
  updateOutreachContact,
  validateOutreachProfileUrl,
  type Contact,
  type ContactConfidence,
  type ContactInteraction,
  type ContactType,
  type NetworkingPlan,
  type NetworkingStrategy,
  type OutreachChannel,
  type OutreachLanguage,
  type OutreachStatus,
} from "@devflow/applyflow-core";

type OutreachDraft = {
  name: string;
  role: string;
  company: string;
  type: ContactType;
  relationDescription: string;
  contactConfidence: ContactConfidence | "";
  evidenceNote: string;
  recommendedCases: string;
  channel: OutreachChannel;
  language: OutreachLanguage;
  linkedinUrl: string;
  email: string;
  status: OutreachStatus;
  subject: string;
  messageContent: string;
  followUpAt: string;
  nextAction: string;
  notes: string;
  inMailCreditConsumed: boolean;
  inMailCredits: string;
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
  MESSAGE_PREPARED: "Ready",
  SENT: "Enviada",
  REPLIED: "Respondida",
  FOLLOW_UP_DUE: "Follow-up due",
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
    relationDescription: "",
    contactConfidence: "",
    evidenceNote: "",
    recommendedCases: "",
    channel: "linkedin",
    language: "EN",
    linkedinUrl: "",
    email: "",
    status: "IDENTIFIED",
    subject: "",
    messageContent: "",
    followUpAt: "",
    nextAction: "",
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
    relationDescription: contact.relationDescription ?? "",
    contactConfidence: contact.contactConfidence ?? "",
    evidenceNote: contact.evidenceNote ?? "",
    recommendedCases: (contact.recommendedCases ?? []).join(", "),
    channel: contact.channel ?? "linkedin",
    language: contact.language ?? "EN",
    linkedinUrl: contact.linkedinUrl ?? "",
    email: contact.email ?? "",
    status: status === "FOLLOW_UP_DUE" ? "SENT" : status,
    subject: contact.subject ?? "",
    messageContent: contact.messageContent ?? "",
    followUpAt: toLocalDateTime(contact.followUpAt ?? contact.nextActionAt),
    nextAction: contact.nextAction ?? "",
    notes: contact.notes ?? "",
    inMailCreditConsumed: contact.inMailCreditConsumed ?? false,
    inMailCredits: String(contact.inMailCredits ?? 1),
  };
}

function statusTone(status: OutreachStatus): ApplyFlowBadgeTone {
  return networkingStatusTone(status);
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

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function JobDecisionV2NetworkingTab({
  applicationId,
  jobId,
  company,
  contacts,
  networkingPlan,
  networkingStrategy,
  onPersist,
}: {
  applicationId?: string;
  jobId: string;
  company?: string;
  contacts: Contact[];
  networkingPlan?: NetworkingPlan;
  networkingStrategy?: NetworkingStrategy;
  onPersist: () => void;
}) {
  const activeContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          !contact.archivedAt &&
          contact.jobId === jobId &&
          (applicationId
            ? contact.applicationId === applicationId || !contact.applicationId
            : true),
      ),
    [applicationId, contacts, jobId],
  );
  const metrics = computeOutreachMetrics(activeContacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(company ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  const scope: ApplicationOutreachScope = {
    jobId,
    ...(applicationId ? { applicationId } : {}),
  };

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft(company ?? ""));
    setError(null);
  }

  async function persist(
    contact: Contact,
    interaction?: Parameters<typeof saveDashboardOutreach>[2],
  ): Promise<boolean> {
    if (!personalLocalWritesAllowed()) {
      const generation = currentPersonalClientScope().generation;
      const response = await fetch("/api/applyflow/v2/contacts", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          contact,
          expectedVersion: rememberedContactVersion(contact.id),
        }),
      });
      if (isStalePersonalGeneration(generation)) return false;
      if (!response.ok) {
        setError(
          response.status === 409
            ? "Este contato mudou em outro dispositivo. Recarregue antes de gravar."
            : "Não foi possível gravar o contato na conta.",
        );
        return false;
      }
      const saved = (await response.json()) as { version?: number };
      if (typeof saved.version === "number") rememberContactVersion(contact.id, saved.version);
      if (interaction) {
        const interactionResponse = await fetch("/api/applyflow/v2/contacts", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ interaction }),
        });
        if (isStalePersonalGeneration(generation) || !interactionResponse.ok) {
          setError("O contato foi gravado, mas a interação não.");
          return false;
        }
      }
      const listed = await fetch("/api/applyflow/v2/contacts", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!isStalePersonalGeneration(generation) && listed.ok) {
        const body = (await listed.json()) as {
          contacts?: Contact[];
          interactions?: ContactInteraction[];
          versions?: Record<string, number>;
        };
        for (const [id, version] of Object.entries(body.versions ?? {})) {
          if (typeof version === "number") rememberContactVersion(id, version);
        }
        writeAccountScopedCache(
          APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            savedAt: new Date().toISOString(),
            contacts: body.contacts ?? [],
            interactions: body.interactions ?? [],
          }),
        );
      }
      if (isStalePersonalGeneration(generation)) return true;
      setError(null);
      onPersist();
      return true;
    }
    const result = saveDashboardOutreach(scope, contact, interaction);
    if (!result.ok) {
      setError(
        result.error === "outreach_scope_mismatch"
          ? "Este contato pertence a outra candidatura."
          : result.error === "cloud_authority"
            ? "Este contato pertence à conta e não foi gravado localmente."
            : "Revise os campos do contato antes de guardar (Ready exige mensagem).",
      );
      return false;
    }
    setError(null);
    onPersist();
    return true;
  }

  function contactInScope(contact: Contact): Contact {
    return {
      ...contact,
      jobId: scope.jobId,
      ...(scope.applicationId ? { applicationId: scope.applicationId } : {}),
    };
  }

  async function saveDraft() {
    if (!draft.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    if (!validateOutreachProfileUrl(draft.linkedinUrl, draft.channel)) {
      setError("Use uma URL HTTPS válida; para LinkedIn, use linkedin.com.");
      return;
    }
    if (draft.status === "MESSAGE_PREPARED" && !draft.messageContent.trim()) {
      setError("Status Ready exige uma mensagem.");
      return;
    }
    const current = activeContacts.find((contact) => contact.id === editingId);
    const now = new Date();
    const base: Contact =
      current ?? {
        id: newId("contact"),
        ...(applicationId ? { applicationId } : {}),
        jobId,
        name: draft.name.trim(),
        type: draft.type,
        status: "IDENTIFIED",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    let next = updateOutreachContact(
      contactInScope(base),
      {
        name: draft.name,
        role: draft.role,
        company: draft.company || company,
        type: draft.type,
        relationDescription: draft.relationDescription,
        contactConfidence: draft.contactConfidence || undefined,
        evidenceNote: draft.evidenceNote,
        recommendedCases: draft.recommendedCases
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        channel: draft.channel,
        language: draft.language,
        linkedinUrl: draft.linkedinUrl,
        email: draft.email,
        status: draft.status,
        subject: draft.subject,
        messageContent: draft.messageContent,
        followUpAt: toIsoDateTime(draft.followUpAt),
        nextAction: draft.nextAction,
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
      const sent = markOutreachSent(
        next,
        {
          content: next.messageContent,
          subject: next.subject,
          followUpAt: next.followUpAt,
          interactionId: newId("interaction"),
        },
        now,
      );
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
    if (await persist(next, interaction)) resetForm();
  }

  async function markPrepared(contact: Contact) {
    const scoped = contactInScope(contact);
    const result = markOutreachReady(scoped);
    if (!result.ok) {
      setError("Ready exige uma mensagem salva.");
      return;
    }
    await persist(result.contact);
  }

  async function markSent(contact: Contact) {
    const scopedContact = contactInScope(contact);
    const result = markOutreachSent(scopedContact, {
      content: scopedContact.messageContent,
      subject: scopedContact.subject,
      followUpAt: scopedContact.followUpAt,
      interactionId: `interaction-${scopedContact.id}-sent`,
    });
    await persist(result.contact, result.interaction);
  }

  async function markReply(contact: Contact) {
    const scopedContact = contactInScope(contact);
    const replySource = scopedContact.sentAt
      ? scopedContact
      : { ...scopedContact, sentAt: new Date().toISOString() };
    const result = recordOutreachReply(replySource, {
      interactionId: `interaction-${scopedContact.id}-reply`,
    });
    await persist(result.contact, result.interaction);
  }

  async function scheduleFollowUp(contact: Contact) {
    const due = new Date();
    due.setDate(due.getDate() + 5);
    await persist(scheduleOutreachFollowUp(contactInScope(contact), due.toISOString()));
  }

  async function dismissFollowUp(contact: Contact) {
    await persist(dismissOutreachFollowUp(contactInScope(contact)));
  }

  async function onCopyMessage(contact: Contact) {
    const text = contact.messageContent ?? "";
    const ok = await copyText(text);
    setCopyFlash(ok ? contact.id : null);
    if (!ok) setError("Não foi possível copiar a mensagem.");
  }

  async function archive(contact: Contact) {
    const archived: Contact = {
      ...contactInScope(contact),
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!(await persist(archived))) {
      setError("Não foi possível arquivar este contato.");
      return;
    }
    if (editingId === contact.id) resetForm();
  }

  return (
    <div className="grid gap-4">
      <ApplyFlowCard padding="md">
        <p className="text-xs text-[color:var(--af-text-muted)]">
          Tracking manual. O ApplyFlow não envia mensagens nem acessa o LinkedIn.
        </p>
        {networkingStrategy ? (
          <p className="mt-2 text-sm text-[color:var(--af-text)]">
            Strategy: {NETWORKING_STRATEGY_LABELS[networkingStrategy]}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[color:var(--af-text)]">
          Primeiro contato sugerido: {networkingPlan?.firstContact ?? "—"}
        </p>
        <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{networkingPlan?.reason}</p>
      </ApplyFlowCard>

      <ApplyFlowCard padding="md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Networking
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
            const relationLabel =
              contact.relationDescription?.trim() || CONTACT_TYPE_LABELS[contact.type];
            return (
              <li key={contact.id} className="rounded-lg border border-[color:var(--af-border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <ApplyFlowBadge tone={statusTone(status)}>{STATUS_LABELS[status]}</ApplyFlowBadge>
                    <p className="mt-2 font-medium text-[color:var(--af-text)]">{contact.name}</p>
                    <p className="text-xs text-[color:var(--af-text-muted)]">{relationLabel}</p>
                    {contact.contactConfidence ? (
                      <p className="mt-1 text-xs text-[color:var(--af-text)]">
                        Confidence: {CONTACT_CONFIDENCE_LABELS[contact.contactConfidence]}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs text-[color:var(--af-text-muted)]">
                    {CHANNEL_LABELS[contact.channel ?? "linkedin"]} · {contact.language ?? "EN"}
                  </p>
                </div>
                {contact.evidenceNote ? (
                  <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
                    Why this contact: {contact.evidenceNote}
                  </p>
                ) : null}
                {contact.recommendedCases?.length ? (
                  <p className="mt-1 text-xs text-[color:var(--af-text)]">
                    Recommended case: {contact.recommendedCases.join(" · ")}
                  </p>
                ) : null}
                {contact.messageContent ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--af-text)]">
                    {contact.messageContent}
                  </p>
                ) : null}
                {sentDate ? <p className="mt-2 text-xs">Enviado em {sentDate}</p> : null}
                {contact.channel === "linkedin_inmail" && contact.inMailCreditConsumed ? (
                  <p className="mt-1 text-xs">
                    {contact.inMailCredits ?? 1} LinkedIn InMail credit
                  </p>
                ) : null}
                {status === "FOLLOW_UP_DUE" ? (
                  <p className="mt-2 text-xs text-amber-200">Follow-up due</p>
                ) : null}
                {contact.nextAction ? (
                  <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
                    Next: {contact.nextAction}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <ApplyFlowButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(contact.id);
                      setDraft(draftFrom(contact));
                      setError(null);
                    }}
                  >
                    Edit contact
                  </ApplyFlowButton>
                  {contact.messageContent ? (
                    <ApplyFlowButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void onCopyMessage(contact)}
                    >
                      {copyFlash === contact.id ? "Copied" : "Copy message"}
                    </ApplyFlowButton>
                  ) : null}
                  {status === "IDENTIFIED" && canMarkOutreachReady(contact) ? (
                    <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={() => markPrepared(contact)}>
                      Mark ready
                    </ApplyFlowButton>
                  ) : null}
                  {status === "MESSAGE_PREPARED" || status === "IDENTIFIED" ? (
                    <ApplyFlowButton type="button" variant="outlineBrand" size="sm" onClick={() => markSent(contact)}>
                      Mark as sent
                    </ApplyFlowButton>
                  ) : null}
                  {status === "SENT" || status === "FOLLOW_UP_DUE" ? (
                    <ApplyFlowButton type="button" variant="outlineBrand" size="sm" onClick={() => markReply(contact)}>
                      Mark as replied
                    </ApplyFlowButton>
                  ) : null}
                  {status === "SENT" ? (
                    <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={() => scheduleFollowUp(contact)}>
                      Schedule follow-up
                    </ApplyFlowButton>
                  ) : null}
                  {status === "FOLLOW_UP_DUE" ? (
                    <>
                      <ApplyFlowButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void onCopyMessage(contact)}
                      >
                        Copy follow-up
                      </ApplyFlowButton>
                      <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={() => dismissFollowUp(contact)}>
                        Dismiss
                      </ApplyFlowButton>
                    </>
                  ) : null}
                  {profileUrl ? (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md px-2 py-1 text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      Open LinkedIn
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

      <ApplyFlowCard padding="md">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
          {editingId ? "Edit contact" : "Add contact"}
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
              Relation
              <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ContactType })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Relation description
              <input value={draft.relationDescription} onChange={(event) => setDraft({ ...draft, relationDescription: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              Confidence
              <select
                value={draft.contactConfidence}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    contactConfidence: event.target.value as ContactConfidence | "",
                  })
                }
                className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm"
              >
                <option value="">—</option>
                {Object.entries(CONTACT_CONFIDENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Recommended cases
              <input
                value={draft.recommendedCases}
                onChange={(event) => setDraft({ ...draft, recommendedCases: event.target.value })}
                placeholder="ApplyFlow, Prospecta"
                className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs">
              Canal
              <select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value as OutreachChannel })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Idioma
              <select value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value as OutreachLanguage })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                {["PT", "EN", "ES", "Other"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              LinkedIn / profile URL
              <input type="url" value={draft.linkedinUrl} onChange={(event) => setDraft({ ...draft, linkedinUrl: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OutreachStatus })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm">
                {EDITABLE_OUTREACH_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Follow-up
              <input type="datetime-local" value={draft.followUpAt} onChange={(event) => setDraft({ ...draft, followUpAt: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              Next action
              <input value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
            </label>
          </div>
          <label className="grid gap-1 text-xs">
            Why this contact / evidence
            <textarea rows={2} value={draft.evidenceNote} onChange={(event) => setDraft({ ...draft, evidenceNote: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">
            Edit message
            <textarea rows={5} value={draft.messageContent} onChange={(event) => setDraft({ ...draft, messageContent: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">
            Notas
            <textarea rows={2} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm" />
          </label>
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
    </div>
  );
}
