import Link from "next/link";

export default function QueuesPage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Filas</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>
      <p className="mt-4 text-gray-600">Filas e prioridades (em implementação).</p>
    </div>
  );
}
