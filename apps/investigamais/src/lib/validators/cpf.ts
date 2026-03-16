const CPF_LENGTH = 11;

function stripDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function allSameDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function checksum(digits: string, factor: number): number {
  let sum = 0;
  for (let i = 0; i < factor; i++) {
    sum += parseInt(digits[i], 10) * (factor + 1 - i);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = stripDigits(value);
  if (digits.length !== CPF_LENGTH) return false;
  if (allSameDigits(digits)) return false;
  if (digits[9] !== String(checksum(digits, 9))) return false;
  if (digits[10] !== String(checksum(digits, 10))) return false;
  return true;
}

export function formatCpfDigits(value: string): string {
  return stripDigits(value);
}
