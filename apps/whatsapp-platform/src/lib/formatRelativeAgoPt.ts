/** Tempo relativo curto em português (alinhado ao padrão usado em health/IA). */
export function formatRelativeAgoPt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "há segundos";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia(s)`;
}
