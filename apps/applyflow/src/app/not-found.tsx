import Link from "next/link";

export default function ApplyFlowNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-[color:var(--af-text)]">Página não encontrada</h1>
      <p className="mt-3 text-sm text-[color:var(--af-text-muted)]">
        Esta rota não existe no ApplyFlow.
      </p>
      <Link href="/dashboard" className="mt-6 text-sm text-emerald-200 underline underline-offset-2">
        Ir ao dashboard
      </Link>
    </main>
  );
}
