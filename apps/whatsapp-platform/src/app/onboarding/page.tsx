import type { Metadata } from "next";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata: Metadata = {
  title: "Ativação | WhatsApp Platform",
  description: "Configure o assistente e ligue o WhatsApp Business em poucos passos",
  robots: "noindex, nofollow",
};

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-center mb-8">Ativação da conta</h1>
        <OnboardingWizard />
      </div>
    </main>
  );
}
