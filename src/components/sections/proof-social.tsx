const claims = [
  "Projetado para operações com alto volume de mensagens",
  "Estrutura preparada para restaurantes, lojas, clínicas e tabacarias",
  "Baseado em automação real com WhatsApp Cloud API",
];

export function ProofSocial() {
  return (
    <section
      id="prova-social"
      className="py-16"
      aria-labelledby="proof-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-8">
          <p className="df-text-secondary text-center text-sm font-medium">
            Prova social
          </p>
          <ul className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center" role="list">
            {claims.map((claim) => (
              <li
                key={claim}
                className="df-text-primary flex items-center gap-2 text-sm leading-relaxed"
              >
                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                {claim}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
