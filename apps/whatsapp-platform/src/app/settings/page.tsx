import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Configurações</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>
      <p className="mt-4 text-gray-600">Configurações do produto (em implementação).</p>
    </div>
  );
}
