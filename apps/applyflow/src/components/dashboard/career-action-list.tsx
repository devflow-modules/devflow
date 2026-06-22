export function CareerActionList({ actions }: { actions: string[] }) {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-[color:var(--af-text-muted)]">
        Revise o resumo e os achados para definir seus próximos passos.
      </p>
    );
  }

  return (
    <ol className="space-y-3" data-testid="career-pilot-result-action-list">
      {actions.map((action, index) => (
        <li
          key={action}
          className="flex gap-3 rounded-[var(--af-radius-sm)] border border-emerald-500/20 bg-[color:var(--af-brand-soft)] px-3 py-3"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--af-brand)] text-sm font-semibold text-[color:var(--af-on-brand)]"
          >
            {index + 1}
          </span>
          <p className="text-sm leading-relaxed text-[color:var(--af-text)]">{action}</p>
        </li>
      ))}
    </ol>
  );
}
