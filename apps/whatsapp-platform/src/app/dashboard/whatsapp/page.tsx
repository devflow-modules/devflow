import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StateLoading } from "@/components/ui/app-states";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isAgent } from "@/lib/roles";
import { WhatsappConnectClient } from "./WhatsappConnectClient";

export default async function DashboardWhatsappPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isAgent(auth.payload.role)) {
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
      />
      <Suspense fallback={<StateLoading message="A preparar…" />}>
        <WhatsappConnectClient />
      </Suspense>
    </div>
  );
}
