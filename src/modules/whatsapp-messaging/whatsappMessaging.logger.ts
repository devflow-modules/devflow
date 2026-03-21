export function maskPhoneForLog(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length <= 4) return "***";
  return d.slice(0, 2) + "***" + d.slice(-2);
}
