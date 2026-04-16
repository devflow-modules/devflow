import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StateLoading } from "@/components/ui/app-states";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isOperator } from "@/lib/roles";
import Link from "next/link";
import { WhatsappConnectClient } from "./WhatsappConnectClient";
import { isWhiteLabelMode } from "@/lib/productMode";

export default async function DashboardWhatsappPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isOperator(auth.payload.role)) {
    redirect("/inbox");
  }
  const wl = isWhiteLabelMode();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Canal WhatsApp"
        title="Ligação e gestão"
        description="Veja o estado da ligação, ligue números WhatsApp Business e defina qual linha é principal e qual usar no envio padrão. A Inbox e as mensagens saídas seguem estas escolhas."
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <Link href="/settings" className="df-quick-action">
              Configurações
            </Link>
            {!wl ? (
              <Link href="/billing" className="df-quick-action">
                Plano e faturação
              </Link>
            ) : null}
          </>
        }
      />
      <Suspense fallback={<StateLoading message="A preparar…" />}>
        <WhatsappConnectClient />
      </Suspense>
    </div>
  );
}
