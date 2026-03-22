import Link from "next/link";
import { AiSettingsForm } from "./AiSettingsForm";

export default function AiSettingsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">IA de atendimento</h1>
          <p className="text-slate-600 text-sm">
            Respostas automáticas por tenant no WhatsApp. Requer motor OpenAI ou Claude em{" "}
            <Link href="/settings" className="text-blue-600 underline">
              Configurações
            </Link>
            .
          </p>
        </div>
        <Link
          href="/settings/ai-analytics"
          className="text-sm text-blue-600 hover:underline"
        >
          Ver uso e custo →
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Guia de ativação</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
          <li>
            <Link href="/settings" className="text-blue-600 hover:underline">
              Conectar WhatsApp
            </Link>{" "}
            — número e token em Configurações
          </li>
          <li>
            <Link href="/settings" className="text-blue-600 hover:underline">
              Escolher motor
            </Link>{" "}
            — OpenAI ou Claude nas Configurações
          </li>
          <li>
            Ativar IA e editar prompt — use o formulário abaixo
          </li>
          <li>
            <Link href="/inbox" className="text-blue-600 hover:underline">
              Testar
            </Link>{" "}
            — envie uma mensagem no Inbox
          </li>
        </ol>
      </div>

      <AiSettingsForm />
    </div>
  );
}
