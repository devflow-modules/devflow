import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { canAccessDeveloperSettings } from "@/lib/permissions";
import { validateAuthToken } from "@/modules/auth";
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

  if (!canAccessDeveloperSettings(auth.payload.role)) {
    return (
      <div className="df-page-narrow df-stack">
        {header}
        <StateEmpty
          title="Acesso restrito"
          description="Esta área exige permissão de gestor ou administrador da plataforma."
          nextStep="Volte para o painel operacional para continuar."
          action={
            <Link href="/dashboard" className={buttonClassName("primary")}>
              Voltar ao Painel
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
