import Link from "next/link";

export function ApplyFlowSiteFooter() {
  return (
    <footer className="border-t border-[color:var(--af-border)] bg-[color:var(--af-bg)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-[color:var(--af-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="font-medium text-[color:var(--af-text)]">ApplyFlow</p>
          <p className="mt-1 text-xs">DevFlow Labs · beta por convite · sem auto-envio</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-4 gap-y-2 text-xs sm:justify-end">
          <Link href="/#como-funciona" className="hover:text-emerald-300">
            Como funciona
          </Link>
          <Link href="/#privacidade" className="hover:text-emerald-300">
            Privacidade
          </Link>
          <Link href="/documentacao" className="hover:text-emerald-300">
            Documentação
          </Link>
          <Link href="/login" className="hover:text-emerald-300">
            Entrar
          </Link>
        </nav>
      </div>
    </footer>
  );
}
