/** Máscara para logs — nunca registar token completo. */
export function maskAccessTokenForLog(token: string): string {
  const t = token.trim();
  if (t.length <= 12) return "***";
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}
