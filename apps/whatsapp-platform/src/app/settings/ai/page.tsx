import Link from "next/link";
import { AiSettingsForm } from "./AiSettingsForm";

export default function AiSettingsPage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-2">IA de atendimento</h1>
      <p className="text-slate-600 text-sm mb-6">
        Respostas automáticas por tenant no WhatsApp. Requer motor OpenAI ou Claude em{" "}
        <Link href="/settings" className="text-blue-600 underline">
          Configurações
        </Link>
        .
      </p>
      <AiSettingsForm />
    </div>
  );
}
