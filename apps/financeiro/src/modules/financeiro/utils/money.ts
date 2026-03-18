/**
 * Arredondamento monetário consistente (2 casas decimais).
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export const MONEY_EPS = 0.005;
