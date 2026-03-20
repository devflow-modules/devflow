import Link from "next/link";
import { WhatsappConnectClient } from "./WhatsappConnectClient";

export default function DashboardWhatsappPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">WhatsApp — Números conectados</h1>
      <p className="text-slate-600 text-sm mb-6">
        Conecte seu número WhatsApp Business para receber e enviar mensagens pela plataforma.{" "}
        <Link href="/dashboard" className="text-blue-600 underline">
          Voltar ao Dashboard
        </Link>
      </p>
      <WhatsappConnectClient />
    </div>
  );
}
