import { useEffect, useState } from "react";

/**
 * Shows whether the extension currently holds an ApplyFlow account grant.
 * Status responses never include the bearer token.
 */
export function OptionsAccountConnection() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "signed_out" }
    | { status: "signed_in"; accountId: string; scopes: string[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void chrome.runtime
      .sendMessage({ type: "APPLYFLOW_ACCOUNT_STATUS" })
      .then(
        (
          response:
            | { signedIn?: boolean; accountId?: string | null; scopes?: string[] }
            | undefined,
        ) => {
          if (cancelled) return;
          if (response?.signedIn && typeof response.accountId === "string") {
            setState({
              status: "signed_in",
              accountId: response.accountId,
              scopes: Array.isArray(response.scopes) ? response.scopes : [],
            });
            return;
          }
          setState({ status: "signed_out" });
        },
      )
      .catch(() => {
        if (!cancelled) setState({ status: "signed_out" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <p className="af-opt-section-lead" data-testid="extension-account-status">
        A verificar ligação à conta ApplyFlow…
      </p>
    );
  }

  if (state.status === "signed_in") {
    const masked =
      state.accountId.length > 8
        ? `${state.accountId.slice(0, 4)}…${state.accountId.slice(-4)}`
        : state.accountId;
    const hasContacts =
      state.scopes.includes("contacts:read") && state.scopes.includes("contacts:write");
    return (
      <div data-testid="extension-account-status" data-signed-in="true">
        <p className="af-opt-section-lead">
          Conta ApplyFlow ligada ({masked}). O token fica só no service worker; o painel LinkedIn não
          o recebe.
        </p>
        <p className="af-opt-section-lead">
          Permissões do grant:{" "}
          {state.scopes.length > 0 ? state.scopes.join(", ") : "nenhuma (reconecte em /account)"}.
          {hasContacts
            ? " Contactos autorizados."
            : " Sem contactos — reconecte e confirme contacts:read/write."}
        </p>
      </div>
    );
  }

  return (
    <p className="af-opt-section-lead" data-testid="extension-account-status" data-signed-in="false" role="status">
      Sem ligação à conta ApplyFlow (grant ausente ou expirado). Abra o dashboard em{" "}
      <strong>/account</strong>, confirme as permissões pedidas e clique em <strong>Ligar extensão</strong>{" "}
      para reconectar. Sem auto-submit.
    </p>
  );
}
