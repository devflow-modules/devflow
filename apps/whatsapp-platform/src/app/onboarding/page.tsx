import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isOperator } from "@/lib/roles";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata: Metadata = {
  title: "Ativação | WhatsApp Platform",
  description: "Conecte o WhatsApp, teste e comece a atender em poucos passos",
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
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-center text-2xl font-semibold text-slate-900">Ativação da conta</h1>
        <QueryProvider>
          <OnboardingWizard />
        </QueryProvider>
      </div>
    </main>
  );
}
