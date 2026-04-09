import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { permissionsMessages } from "@/lib/permissionsMessages";
import { validateAuthToken } from "@/modules/auth";
import { DeveloperApiKeyClient } from "./DeveloperApiKeyClient";

export const metadata: Metadata = {
  title: "Integrações e API | WhatsApp Platform",
  robots: "noindex, nofollow",
};

export default async function DeveloperSettingsPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;

  const header = (
    <PageHeader
      eyebrow="Avançado"
      title="Integrações e API"
      description="Gere a chave de API do tenant para integrações técnicas. A ativação do WhatsApp e as instruções do assistente não dependem disto."
      layout="split"
      showDivider
    />
  );

  if (!auth) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
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

  if (auth.payload.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        {header}
        <StateEmpty
          title="Acesso restrito a administradores"
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
    <div className="mx-auto max-w-3xl space-y-8">
      {header}
      <DeveloperApiKeyClient />
    </div>
  );
}
