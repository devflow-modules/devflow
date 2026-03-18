import { roundMoney } from "@/modules/financeiro/utils/money";

/**
 * Minimiza o número de transferências entre participantes.
 * Entrada: saldos por nome (positivo = recebe, negativo = deve).
 * Saída: lista de transferências { from, to, amount }.
 */
export function simplifyDebts(
  balances: Record<string, number>
): { from: string; to: string; amount: number }[] {
  const names = Object.keys(balances).filter((n) => Math.abs(balances[n] ?? 0) > 0.01);
  const creditors = names
    .filter((n) => (balances[n] ?? 0) > 0.01)
    .map((n) => ({ name: n, amount: roundMoney(balances[n] ?? 0) }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = names
    .filter((n) => (balances[n] ?? 0) < -0.01)
    .map((n) => ({ name: n, amount: roundMoney(balances[n] ?? 0) }))
    .sort((a, b) => a.amount - b.amount);

  const transfers: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const cred = creditors[i];
    const deb = debtors[j];
    if (cred.amount < 0.01 || deb.amount > -0.01) break;
    const amount = Math.min(cred.amount, -deb.amount);
    const rounded = roundMoney(amount);
    if (rounded > 0) {
      transfers.push({ from: deb.name, to: cred.name, amount: rounded });
      cred.amount -= rounded;
      deb.amount += rounded;
    }
    if (cred.amount < 0.01) i++;
    if (deb.amount > -0.01) j++;
  }

  return transfers;
}
