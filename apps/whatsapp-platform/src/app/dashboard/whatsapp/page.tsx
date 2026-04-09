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

const qaClass =
  "rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/90 transition hover:bg-slate-50";

export default async function DashboardWhatsappPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isOperator(auth.payload.role)) {
    redirect("/inbox");
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Ligação"
        title="WhatsApp Business"
        description="Números autorizados na Meta para esta conta — receber e enviar mensagens pela plataforma."
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <Link href="/settings" className={qaClass}>
              Configurações
            </Link>
            <Link href="/billing" className={qaClass}>
              Cobrança
            </Link>
          </>
        }
      />
      <Suspense fallback={<StateLoading message="A preparar…" />}>
        <WhatsappConnectClient />
      </Suspense>
    </div>
  );
}
