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
      eyebrow="Configuração"
      title="API e integrações"
      description="Chave de API para chamadas server-to-server (webhooks, sistemas externos). A linha WhatsApp e o assistente funcionam sem isto — use quando precisar de automatizar fora da app."
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
          title="Acesso restrito a admins"
          description={permissionsMessages.adminOnly}
          nextStep="Operadores usam a Inbox; admins gerem a conta em Configurações."
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
