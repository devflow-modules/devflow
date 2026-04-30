import Link from "next/link";

export default function InvestigamaisHome() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">Investiga+</h1>
      <p className="mt-2 df-text-secondary">Inteligência CNPJ — DevFlow Labs.</p>
      <div className="mt-4 flex gap-4">
        <Link href="/login" className="text-blue-600 underline">Entrar</Link>
        <Link href="/dashboard" className="text-blue-600 underline">Dashboard</Link>
      </div>
    </main>
  );
}
