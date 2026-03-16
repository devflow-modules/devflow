import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">WhatsApp Platform</h1>
      <p className="mt-2 text-slate-600">DevFlow — AI Support Platform.</p>
      <Link href="/dashboard" className="mt-4 text-blue-600 underline">
        Ir para o Dashboard
      </Link>
    </main>
  );
}
