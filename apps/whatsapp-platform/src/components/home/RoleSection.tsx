const ROLES = [
  { label: "Gestor", hint: "acompanha e decide" },
  { label: "Operador", hint: "responde e executa" },
  { label: "Admin", hint: "monitora e controla" },
] as const;

export function RoleSection() {
  return (
    <section className="mt-16 text-center" aria-labelledby="perfis-heading">
      <h2 id="perfis-heading" className="text-lg font-semibold text-slate-900">
        Feito para gestores, operadores e administradores
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        Cada perfil vê exatamente o que precisa para agir.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {ROLES.map((r) => (
          <span
            key={r.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <span className="text-slate-900">{r.label}</span>
            <span className="text-slate-500">→ {r.hint}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
