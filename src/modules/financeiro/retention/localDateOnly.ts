/** YYYY-MM-DD no fuso local (comparar com dueDate/receivedAt do usuário). */
export function localDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localYesterdayOnly(now: Date): string {
  const copy = new Date(now);
  copy.setDate(copy.getDate() - 1);
  return localDateOnly(copy);
}
