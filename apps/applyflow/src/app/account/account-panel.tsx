"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PersonalImportConfirm } from "@/components/dashboard/personal-import-confirm";
import {
  clearInstalledExtensionGrant,
  deliverExtensionGrant,
} from "@/lib/persistence-v2/personal/extension-handoff";
import {
  EXTENSION_GRANT_REQUESTABLE_SCOPES,
  EXTENSION_GRANT_SCOPE_LABELS,
  type ExtensionGrantScope,
} from "@/lib/persistence-v2/personal/extension-grant-scopes";

type MePayload = {
  authenticated?: boolean;
  account?: { id?: string };
  error?: string;
};

type ProbeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; accountId: string }
  | { status: "error"; httpStatus: number; error: string };

function maskAccountId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function AccountPanel() {
  const router = useRouter();
  const [probe, setProbe] = useState<ProbeState>({ status: "idle" });
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<ExtensionGrantScope[]>([
    ...EXTENSION_GRANT_REQUESTABLE_SCOPES,
  ]);
  const [permissionsConfirmed, setPermissionsConfirmed] = useState(false);
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const contactsSelected = useMemo(
    () => selectedScopes.includes("contacts:read") && selectedScopes.includes("contacts:write"),
    [selectedScopes],
  );

  async function runProbe() {
    setProbe({ status: "loading" });
    try {
      const response = await fetch("/api/applyflow/v2/me", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => ({}))) as MePayload;
      if (!response.ok) {
        setProbe({
          status: "error",
          httpStatus: response.status,
          error: body.error ?? "request_failed",
        });
        return;
      }
      const accountId = body.account?.id;
      if (!accountId) {
        setProbe({
          status: "error",
          httpStatus: response.status,
          error: "missing_account_id",
        });
        return;
      }
      setProbe({ status: "ok", accountId });
    } catch {
      setProbe({
        status: "error",
        httpStatus: 0,
        error: "network_error",
      });
    }
  }

  function toggleScope(scope: ExtensionGrantScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
    setPermissionsConfirmed(false);
    setLinkStatus(null);
  }

  async function linkExtension() {
    setLinkStatus(null);
    if (!permissionsConfirmed) {
      setLinkStatus("Confirme as permissões pedidas antes de ligar a extensão.");
      return;
    }
    if (selectedScopes.length === 0) {
      setLinkStatus("Seleccione pelo menos uma permissão.");
      return;
    }
    setLinking(true);
    try {
      const response = await fetch("/api/applyflow/v2/extension/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scopes: selectedScopes }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        accountId?: string;
        token?: string;
        expiresAt?: string;
        scopes?: string[];
        error?: string;
      };
      if (!response.ok) {
        setLinkStatus(
          body.error === "scopes_required"
            ? "O servidor exige permissões explícitas. Recarregue e tente de novo."
            : "Não foi possível ligar a extensão.",
        );
        return;
      }
      if (!body.accountId || !body.token || !body.expiresAt) {
        setLinkStatus("Resposta incompleta do servidor.");
        return;
      }
      deliverExtensionGrant({
        accountId: body.accountId,
        token: body.token,
        expiresAt: body.expiresAt,
        scopes: body.scopes,
      });
      setLinkStatus(
        contactsSelected
          ? "Extensão ligada com contactos. Confirmação só depois da resposta do servidor nas operações."
          : "Extensão ligada sem contactos. Reconecte e marque contactos para sincronizar outreach.",
      );
    } catch {
      setLinkStatus("Falha de rede. A extensão não foi ligada.");
    } finally {
      setLinking(false);
    }
  }

  async function handleSignOut() {
    setSignOutError(null);
    setSigningOut(true);
    try {
      clearInstalledExtensionGrant();
      await fetch("/api/applyflow/v2/extension/session", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      }).catch(() => null);

      await fetch("/api/applyflow/e2e/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ action: "logout" }),
      }).catch(() => null);

      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
          setSignOutError("Não foi possível terminar a sessão.");
          return;
        }
      } catch {
        // Supabase may be absent in local-first / E2E fixture mode.
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Não foi possível terminar a sessão.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ApplyFlowCard className="w-full max-w-lg space-y-5" padding="lg">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
          ApplyFlow · Persistence V2
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--af-text)]">
          Cloud account
        </h1>
        <p className="mt-2 text-sm text-[color:var(--af-text-muted)]">
          Safe probe of <code className="text-[color:var(--af-text)]">GET /api/applyflow/v2/me</code>.
          No tokens or cookies are displayed.
        </p>
      </div>

      {probe.status === "idle" ? (
        <p className="text-sm text-[color:var(--af-text-muted)]">
          Click probe to call <code className="text-[color:var(--af-text)]">/me</code> with the
          current SSR session cookies.
        </p>
      ) : null}

      {probe.status === "loading" ? (
        <p className="text-sm text-[color:var(--af-text-muted)]">Checking session…</p>
      ) : null}

      {probe.status === "ok" ? (
        <div
          className="rounded-[var(--af-radius-sm)] border border-emerald-500/35 bg-emerald-950/30 px-3 py-3 text-sm text-emerald-100"
          role="status"
        >
          <p>Authenticated</p>
          <p className="mt-1 text-[color:var(--af-text-muted)]">
            Account ID:{" "}
            <code className="text-[color:var(--af-text)]">{maskAccountId(probe.accountId)}</code>
          </p>
        </div>
      ) : null}

      {probe.status === "error" ? (
        <div
          className="rounded-[var(--af-radius-sm)] border border-red-500/40 bg-red-950/30 px-3 py-3 text-sm text-red-100"
          role="alert"
        >
          <p>
            Probe failed ({probe.httpStatus || "network"}): {probe.error}
          </p>
          {probe.httpStatus === 401 ? (
            <p className="mt-2 text-red-200/90">
              No session.{" "}
              <Link href="/login" className="underline underline-offset-2">
                Sign in
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {probe.status === "ok" ? <PersonalImportConfirm accountId={probe.accountId} /> : null}

      {probe.status === "ok" ? (
        <section className="space-y-3 border-t border-[color:var(--af-border)] pt-4" data-testid="extension-permissions">
          <h2 className="text-sm font-semibold text-[color:var(--af-text)]">
            Permissões da extensão
          </h2>
          <p className="text-sm text-[color:var(--af-text-muted)]">
            Grants antigos não recebem contactos automaticamente. Reconecte e confirme as permissões
            pedidas. O servidor verifica cada permissão na leitura e na escrita.
          </p>
          <ul className="space-y-2">
            {EXTENSION_GRANT_REQUESTABLE_SCOPES.map((scope) => (
              <li key={scope}>
                <label className="flex items-start gap-2 text-sm text-[color:var(--af-text)]">
                  <input
                    type="checkbox"
                    data-testid={`extension-scope-${scope}`}
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <span>
                    <code className="text-xs">{scope}</code>
                    <span className="mt-0.5 block text-[color:var(--af-text-muted)]">
                      {EXTENSION_GRANT_SCOPE_LABELS[scope]}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-2 text-sm text-[color:var(--af-text)]">
            <input
              type="checkbox"
              data-testid="extension-permissions-confirm"
              checked={permissionsConfirmed}
              onChange={(event) => setPermissionsConfirmed(event.target.checked)}
            />
            <span>
              Confirmo que a extensão pode usar exactamente estas permissões nesta conta.
            </span>
          </label>
          {linkStatus ? (
            <p className="text-sm text-[color:var(--af-text-muted)]" role="status" data-testid="extension-link-status">
              {linkStatus}
            </p>
          ) : null}
        </section>
      ) : null}

      {signOutError ? (
        <p className="text-sm text-red-200" role="alert">
          {signOutError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <ApplyFlowButton
          type="button"
          onClick={() => void runProbe()}
          disabled={probe.status === "loading"}
        >
          {probe.status === "idle" ? "Probe /me" : "Refresh /me"}
        </ApplyFlowButton>
        <ApplyFlowButton
          type="button"
          variant="secondary"
          data-testid="applyflow-link-extension"
          onClick={() => void linkExtension()}
          disabled={probe.status !== "ok" || linking}
        >
          {linking ? "A ligar…" : "Ligar extensão"}
        </ApplyFlowButton>
        <ApplyFlowButton
          type="button"
          variant="secondary"
          data-testid="applyflow-logout"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? "A sair…" : "Sair"}
        </ApplyFlowButton>
        <Link href="/login" className={applyFlowButtonClass({ variant: "secondary" })}>
          Back to login
        </Link>
      </div>
    </ApplyFlowCard>
  );
}
