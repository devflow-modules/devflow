function FindingList({ items, emptyLabel, testId }: { items: string[]; emptyLabel: string; testId: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-[color:var(--af-text-muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2" data-testid={testId}>
      {items.map((item) => (
        <li
          key={item}
          className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)] px-3 py-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CareerFindingGroup({
  strengths,
  improvements,
}: {
  strengths: string[];
  improvements: string[];
}) {
  return (
    <section aria-labelledby="career-pilot-result-findings-title" data-testid="career-pilot-result-findings">
      <h4 id="career-pilot-result-findings-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        Principais achados
      </h4>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-[color:var(--af-text)]">
            <span aria-hidden className="text-emerald-400">
              +
            </span>
            Pontos fortes
          </p>
          <FindingList
            items={strengths}
            emptyLabel="Nenhum ponto forte destacado nesta análise."
            testId="career-pilot-result-strengths"
          />
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-[color:var(--af-text)]">
            <span aria-hidden className="text-amber-400">
              !
            </span>
            O que merece atenção
          </p>
          <FindingList
            items={improvements}
            emptyLabel="Nenhum ponto de melhoria prioritário identificado."
            testId="career-pilot-result-improvements"
          />
        </div>
      </div>
    </section>
  );
}
