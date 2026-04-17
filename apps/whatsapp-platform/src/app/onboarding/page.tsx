import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isOperator } from "@/lib/roles";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { OnboardingWizard } from "./OnboardingWizard";

const wlOnboarding = process.env.NEXT_PUBLIC_PRODUCT_MODE === "WHITE_LABEL";

export const metadata: Metadata = {
  title: wlOnboarding ? "Configuração do sistema | WhatsApp Platform" : "Ativação | WhatsApp Platform",
  description: wlOnboarding
    ? "Ligue o canal, valide mensagens e conclua a configuração assistida da operação."
    : "Conecte o WhatsApp, teste e comece a atender em poucos passos",
  robots: "noindex, nofollow",
};

export default async function OnboardingPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isOperator(auth.payload.role)) {
    redirect("/inbox");
  }
  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-8">
        <h1 className="mb-8 text-center text-2xl font-semibold text-slate-900">
          {wlOnboarding ? "Configuração assistida" : "Ativação da conta"}
        </h1>
        <QueryProvider>
          <OnboardingWizard />
        </QueryProvider>
      </div>
    </main>
  );
}
