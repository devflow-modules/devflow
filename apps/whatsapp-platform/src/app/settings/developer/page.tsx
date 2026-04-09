import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { permissionsMessages } from "@/lib/permissionsMessages";
import { validateAuthToken } from "@/modules/auth";
import { isTenantManager } from "@/lib/roles";
import { DeveloperHeaderQuickActions } from "./DeveloperHeaderQuickActions";
import { DeveloperApiKeyClient } from "./DeveloperApiKeyClient";

export const metadata: Metadata = {
  title: "API e integrações | WhatsApp Platform",
  description: "Chaves e integrações técnicas do espaço de trabalho.",
  robots: "noindex, nofollow",
};

export default async function DeveloperSettingsPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;

  const header = (
    <PageHeader
      eyebrow="Avançado"
      title="API e integrações"
      description="Gere a chave do espaço de trabalho para integrações server-to-server. A ligação WhatsApp e o assistente não dependem disto."
      layout="split"
      showDivider
      tone="admin"
      quickActions={<DeveloperHeaderQuickActions />}
    />
  );

  if (!auth) {
    return (
      <div className="df-page-narrow df-stack">
        {header}
        <StateEmpty
          title="Sessão necessária"
          description="Inicie sessão para aceder a esta página."
          action={
            <Link
              href={`/login?next=${encodeURIComponent("/settings/developer")}`}
              className={buttonClassName("primary")}
            >
              Ir para o login
            </Link>
          }
        />
      </div>
    );
  }

  if (!isTenantManager(auth.payload.role)) {
    return (
      <div className="df-page-narrow df-stack">
        {header}
        <StateEmpty
          title="Acesso restrito a gestores"
          description={permissionsMessages.adminOnly}
          action={
            <Link href="/settings" className={buttonClassName("primary")}>
              Voltar às configurações
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="df-page-narrow df-stack">
      {header}
      <DeveloperApiKeyClient />
    </div>
  );
}
