const ROLES = [
  { label: "Admin", hint: "gestão do sistema e da conta" },
  { label: "Operador", hint: "atendimento na inbox" },
] as const;

export function RoleSection() {
  return (
    <section className="mt-16 text-center" aria-labelledby="perfis-heading">
      <h2 id="perfis-heading" className="text-lg font-semibold df-text-primary">
        Feito para admins e operadores
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm df-text-secondary">
        Cada perfil vê o que precisa: gestão ou execução no WhatsApp.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {ROLES.map((r) => (
          <span
            key={r.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-muted/60/90 px-3 py-1.5 text-xs font-medium df-text-secondary"
          >
            <span className="df-text-primary">{r.label}</span>
            <span className="df-text-muted">→ {r.hint}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
