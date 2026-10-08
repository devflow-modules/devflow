const items = [
  "API oficial da Meta",
  "Webhooks",
  "Multiatendimento",
  "Handoff humano",
] as const;

export function TechnicalTrustStrip() {
  return (
    <div className="border-y border-[var(--df-v2-border)] bg-[var(--df-v2-surface)]" role="note" aria-label="Infraestrutura técnica">
      <ul className="df-v2-container flex flex-col gap-3 py-4 text-sm font-medium text-[var(--df-v2-ink-soft)] sm:flex-row sm:flex-wrap sm:justify-between sm:gap-6 sm:py-5" role="list">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--df-v2-accent)]" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
