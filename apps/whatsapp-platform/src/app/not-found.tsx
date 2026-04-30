import Link from "next/link";

/**
 * 404 explícito e leve: sem shell nem client hooks, só conteúdo estático.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-medium df-text-muted">404</p>
      <h1 className="text-xl font-semibold df-text-primary">Página não encontrada</h1>
      <p className="text-sm df-text-secondary">
        O endereço pode estar incorreto ou a página foi removida.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Ir ao início
      </Link>
    </main>
  );
}
