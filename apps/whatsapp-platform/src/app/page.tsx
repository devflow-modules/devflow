import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">WhatsApp Platform</h1>
      <p className="mt-2 text-slate-600">DevFlow — AI Support Platform.</p>
      <div className="mt-4 flex gap-4">
        <Link href="/login" className="text-blue-600 underline hover:no-underline">
          Entrar
        </Link>
        <Link href="/signup" className="text-blue-600 underline hover:no-underline">
          Cadastrar
        </Link>
        <Link href="/dashboard" className="text-blue-600 underline hover:no-underline">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
