/**
 * Formatação legível para exibição (dashboard / inbox).
 * Heurística BR (+55); caso contrário, prefixo + e grupos simples.
 */

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * @param input — E.164, com +, ou só dígitos com DDI
 */
export function formatPhoneInternational(input: string | null | undefined): string {
  if (input == null || !String(input).trim()) return "";
  const d = onlyDigits(input);
  if (!d) return String(input).trim();

  if (d.startsWith("55") && d.length >= 12) {
    const rest = d.slice(2);
    const ddd = rest.slice(0, 2);
    const num = rest.slice(2);
    if (num.length === 9) {
      return `+55 ${ddd} ${num.slice(0, 5)}-${num.slice(5)}`;
    }
    if (num.length === 8) {
      return `+55 ${ddd} ${num.slice(0, 4)}-${num.slice(4)}`;
    }
    return `+55 ${ddd} ${num}`;
  }

  if (d.startsWith("351") && d.length >= 12) {
    const rest = d.slice(3);
    return `+351 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim();
  }

  return `+${d}`;
}

/** Rótulo curto para dashboard / inbox (enum Prisma WhatsappPhoneNumberStatus). */
export function formatWhatsappLineStatusForUi(status: string | null | undefined): string | null {
  if (!status) return null;
  if (status === "ACTIVE") return "Status: ativo ✓";
  return "Status: não conectado ⚠";
}
