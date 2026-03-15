"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/financeiro/Breadcrumbs";
import { Skeleton } from "@/components/financeiro/Skeleton";
import { useHousehold } from "@/lib/financeiro/household/HouseholdProvider";
import { createClient } from "@/lib/financeiro/supabase/client";
import { cn } from "@/lib/financeiro/cn";
import { focusRingLight } from "@/lib/financeiro/primitives";

type Invite = { id: string; email: string; role: "MEMBER" | "OWNER"; expiresAt: string; createdAt: string };
type Member = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  role: "MEMBER" | "OWNER";
  createdAt: string;
  isMe: boolean;
};

const PERMISSIONS_BY_ROLE: Record<"OWNER" | "MEMBER", string[]> = {
  OWNER: [
    "Ver e editar fontes, receitas, despesas e regras",
    "Ver dashboard e projeção de fluxo de caixa",
    "Convidar pessoas por e-mail (criar, listar e revogar convites)",
    "Transferir titularidade para outro membro",
    "Remover outros membros da casa",
    "Definir metas de investimento e guarda (por mês)",
    "Trocar casa ativa e criar nova casa",
    "Sair da casa (após transferir a titularidade)",
  ],
  MEMBER: [
    "Ver e editar fontes, receitas, despesas e regras",
    "Ver dashboard e projeção de fluxo de caixa",
    "Trocar casa ativa e criar nova casa",
    "Sair da casa",
  ],
};

export default function SettingsPage() {
  const router = useRouter();
  const { household, households, isLoading: householdLoading, setHousehold, refetchMe, activeMembershipRole } = useHousehold();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "OWNER">("MEMBER");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [transferringMembershipId, setTransferringMembershipId] = useState<string | null>(null);
  const [createHouseholdLoading, setCreateHouseholdLoading] = useState(false);
  const [householdCreate, setHouseholdCreate] = useState({ name: "", slug: "" });

  const toSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const loadInvites = async () => {
    if (!household?.id) return;
    setInvitesLoading(true);
    try {
      const res = await fetch("/api/invites");
      const payload = await res.json();
      if (!payload.success) {
        setInvites([]);
        return;
      }
      setInvites(payload.data ?? []);
    } finally {
      setInvitesLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!household?.id) return;
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/households/${household.id}/members`);
      const payload = await res.json();
      if (!payload.success) {
        setMembers([]);
        return;
      }
      setMembers(payload.data?.members ?? []);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (household?.id) {
      // Evita "vazar" itens visuais da casa anterior enquanto carrega a nova.
      setInvites([]);
      setMembers([]);
      setLastInviteUrl(null);
      loadMembers();
      if (activeMembershipRole === "OWNER") loadInvites();
    }
  }, [household?.id, activeMembershipRole]);

  if (householdLoading || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-14 text-foreground">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <Breadcrumbs />
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {activeMembershipRole === "MEMBER" ? "Conta" : "Configurações"}
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            {activeMembershipRole === "MEMBER" ? "Sua conta" : "Casa e membros"}
          </h1>
          <p className="text-base text-muted-foreground">
            {activeMembershipRole === "MEMBER"
              ? "Troque de casa ou saia da conta quando quiser."
              : "Gerencie a casa ativa e convites (OWNER)."}
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Conta</h2>
              <p className="mt-1 text-sm text-muted-foreground">Logout encerra a sessão do Supabase neste navegador.</p>
            </div>
            <button
              type="button"
              className={cn("rounded-2xl border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground transition hover:bg-muted", focusRingLight)}
              onClick={async () => {
                const confirmed = window.confirm("Sair da conta? Você será redirecionado para a página de login.");
                if (!confirmed) return;
                const supabase = createClient();
                await supabase.auth.signOut();
                await refetchMe();
                router.replace("/ferramentas/financeiro/auth");
              }}
            >
              Sair da conta
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <h2 className="text-lg font-semibold text-foreground">Casa ativa</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Atual</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{household.name}</p>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Slug: {household.slug}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:-translate-y-px hover:shadow-md">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Trocar</p>
              {households.length > 1 ? (
                <select
                  className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={household.id}
                  onChange={(event) => {
                    const next = households.find((h) => h.id === event.target.value);
                    if (next) setHousehold(next);
                  }}
                >
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.slug})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Você só tem uma casa.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Membros</h2>
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
              onClick={loadMembers}
            >
              Atualizar
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu papel na casa ativa: <span className="text-muted-foreground">{activeMembershipRole ?? "—"}</span>
          </p>

          {activeMembershipRole ? (
            <details className="mt-3 rounded-2xl border border-border bg-background p-3 text-sm text-foreground">
              <summary className="cursor-pointer font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Funcionalidades do seu cargo
              </summary>
              <p className="mt-2 text-muted-foreground">Seu cargo: {activeMembershipRole}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                {PERMISSIONS_BY_ROLE[activeMembershipRole].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="mt-4 space-y-2">
            {membersLoading ? (
              <>
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
            ) : (
              members.map((m) => (
                <div key={m.membershipId} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3">
                  <div>
                    <p className="text-sm text-foreground">
                      {m.name ? `${m.name} · ` : ""}
                      {m.email}
                      {m.isMe ? " (você)" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {m.role} · desde {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {m.isMe ? (
                      <button
                        type="button"
                        className="rounded-xl border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
                        onClick={async () => {
                          if (activeMembershipRole === "OWNER") {
                            toast.error("Transfira a titularidade antes de sair.");
                            return;
                          }
                          const confirmed = window.confirm("Deseja sair desta casa? Você perderá o acesso aos dados.");
                          if (!confirmed) return;
                          const res = await fetch(`/api/households/${household.id}/members/${m.membershipId}`, { method: "DELETE" });
                          const payload = await res.json();
                          if (!payload.success) {
                            toast.error(payload.error?.message ?? "Não foi possível sair da casa");
                            return;
                          }
                          toast.success("Você saiu da casa");
                          const nextHouseholdId = payload.data?.nextHouseholdId ?? null;
                          if (nextHouseholdId) {
                            await fetch("/api/me/active-household", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ householdId: nextHouseholdId }),
                            });
                            await refetchMe();
                            loadMembers();
                            return;
                          }
                          await refetchMe();
                          router.push("/ferramentas/financeiro/onboarding");
                        }}
                      >
                        Sair desta casa
                      </button>
                    ) : activeMembershipRole === "OWNER" ? (
                      <>
                        {m.role === "MEMBER" ? (
                          <button
                            type="button"
                            className="rounded-xl border border-amber-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 disabled:opacity-50"
                            disabled={transferringMembershipId !== null}
                            onClick={async () => {
                              const confirmed = window.confirm(
                                `Transferir titularidade para ${m.email}? Você passará a ser MEMBER e poderá sair da casa depois.`
                              );
                              if (!confirmed) return;
                              setTransferringMembershipId(m.membershipId);
                              try {
                                const res = await fetch(`/api/households/${household.id}/transfer-ownership`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ newOwnerMembershipId: m.membershipId }),
                                });
                                const payload = await res.json();
                                if (!payload.success) {
                                  toast.error(payload.error?.message ?? "Não foi possível transferir a titularidade");
                                  return;
                                }
                                toast.success("Titularidade transferida");
                                await refetchMe();
                                loadMembers();
                              } finally {
                                setTransferringMembershipId(null);
                              }
                            }}
                          >
                            {transferringMembershipId === m.membershipId ? "Transferindo..." : "Transferir ownership"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-xl border border-destructive/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-destructive"
                          onClick={async () => {
                            const confirmed = window.confirm(`Remover ${m.email} desta casa?`);
                            if (!confirmed) return;
                            const res = await fetch(`/api/households/${household.id}/members/${m.membershipId}`, { method: "DELETE" });
                            const payload = await res.json();
                            if (!payload.success) {
                              toast.error(payload.error?.message ?? "Não foi possível remover o membro");
                              return;
                            }
                            toast.success("Membro removido");
                            loadMembers();
                          }}
                        >
                          Remover
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {activeMembershipRole === "OWNER" && (
            <p className="mt-2 text-sm text-muted-foreground">
              OWNER pode transferir a titularidade para um MEMBER e depois sair. Somente OWNER remove outros membros.
            </p>
          )}
          {activeMembershipRole === "MEMBER" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Você é membro. Para convites ou alteração de responsável, fale com o dono da casa.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <h2 className="text-lg font-semibold text-foreground">Criar nova casa</h2>
          <p className="mt-2 text-sm text-muted-foreground">Cria uma nova casa e define como ativa automaticamente.</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Nome (ex.: Casa 2026)"
              value={householdCreate.name}
              onChange={(e) => setHouseholdCreate((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
            <input
              type="text"
              placeholder="Slug (ex.: casa-2026)"
              value={householdCreate.slug}
              onChange={(e) => setHouseholdCreate((p) => ({ ...p, slug: toSlug(e.target.value) }))}
              className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Dica: o slug vira parte do identificador da casa. Use apenas letras minúsculas, números e hífen (ex.: <span className="text-muted-foreground">casa-marques</span>).
          </p>

          <div className="mt-3">
            <button
              type="button"
              className="rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground disabled:opacity-50"
              disabled={!householdCreate.name || !householdCreate.slug || createHouseholdLoading}
              onClick={async () => {
                setCreateHouseholdLoading(true);
                try {
                  const res = await fetch("/api/households", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: householdCreate.name, slug: toSlug(householdCreate.slug) }),
                  });
                  const payload = await res.json();
                  if (!payload.success) {
                    toast.error(payload.error?.message ?? "Não foi possível criar a casa");
                    return;
                  }
                  toast.success("Casa criada");
                  setHouseholdCreate({ name: "", slug: "" });
                  await refetchMe();
                } finally {
                  setCreateHouseholdLoading(false);
                }
              }}
            >
              {createHouseholdLoading ? "Criando..." : "Criar casa"}
            </button>
          </div>
        </section>

        {activeMembershipRole === "OWNER" && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Convites</h2>
            <button
              type="button"
              className="rounded-2xl border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
              onClick={loadInvites}
            >
              Atualizar
            </button>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Criar convite</p>
              <div className="mt-3 grid gap-2">
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
                <select
                  className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "OWNER")}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button
                  type="button"
                  className="rounded-2xl bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground"
                  disabled={!inviteEmail || inviteSubmitting}
                  onClick={async () => {
                    setInviteSubmitting(true);
                    setLastInviteUrl(null);
                    try {
                      const res = await fetch("/api/invites", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
                      });
                      const payload = await res.json();
                      if (!payload.success) {
                        const code = payload.error?.code;
                        const acceptUrl = payload.error?.details?.acceptUrl as string | undefined;
                        if (code === "INVITE_ALREADY_PENDING" && acceptUrl) {
                          setLastInviteUrl(acceptUrl);
                          toast.error("Já existe um convite pendente para este e-mail. Copie o link abaixo.");
                        } else if (code === "ALREADY_MEMBER") {
                          toast.error("Este e-mail já é membro desta casa.");
                        } else if (code === "INVITE_SELF") {
                          toast.error("Você não pode convidar o próprio e-mail.");
                        } else {
                          toast.error(payload.error?.message ?? "Erro ao criar convite");
                        }
                        return;
                      }

                      const acceptUrl = payload.data?.acceptUrl as string | undefined;
                      const emailSent = payload.data?.emailSent as boolean | undefined;
                      if (acceptUrl) setLastInviteUrl(acceptUrl);

                      toast.success(emailSent ? "Convite criado e e-mail enviado" : "Convite criado. Copie o link abaixo.");
                      setInviteEmail("");
                      loadInvites();
                    } finally {
                      setInviteSubmitting(false);
                    }
                  }}
                >
                  {inviteSubmitting ? "Enviando..." : "Convidar"}
                </button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Se `RESEND_*` estiver configurado, o convite é enviado por e-mail. Caso contrário, o link é retornado na API e pode ser copiado no dashboard.
              </p>
              {lastInviteUrl ? (
                <div className="mt-3 rounded-2xl border border-border bg-card p-3">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Link do convite</p>
                  <p className="mt-2 break-all text-sm text-foreground">{lastInviteUrl}</p>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="rounded-xl border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(lastInviteUrl);
                          toast.success("Link copiado");
                        } catch {
                          toast.error("Não foi possível copiar automaticamente. Selecione e copie manualmente.");
                        }
                      }}
                    >
                      Copiar link
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Pendentes</p>
              <div className="mt-3 space-y-2">
                {invitesLoading ? (
                  <>
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <Skeleton className="h-12 w-full rounded-2xl" />
                  </>
                ) : invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
                ) : (
                  invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
                      <div>
                        <p className="text-sm text-foreground">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {invite.role} · expira em {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl border border-destructive/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-destructive"
                        onClick={async () => {
                          const res = await fetch(`/api/invites/${invite.id}`, { method: "DELETE" });
                          const payload = await res.json();
                          if (!payload.success) {
                            toast.error(payload.error?.message ?? "Não foi possível revogar o convite");
                            return;
                          }
                          toast.success("Convite revogado");
                          loadInvites();
                        }}
                      >
                        Revogar
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">A listagem/revogação é restrita a OWNER.</p>
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
