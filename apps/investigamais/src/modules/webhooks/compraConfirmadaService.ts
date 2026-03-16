import { createUser } from "@/modules/users/usersRepository";
import { findUserByEmailOrCpf } from "@/modules/users/usersRepository";
import { hashPassword } from "@/modules/auth/authService";
import { isValidEmail } from "@/lib/validators/email";
import { isValidCpf, formatCpfDigits } from "@/lib/validators/cpf";

export interface CompraConfirmadaPayload {
  event?: string;
  customer?: {
    email?: string;
    document?: string;
    name?: string;
    phone_number?: string;
  };
}

export interface CompraConfirmadaResult {
  ok: boolean;
  created?: boolean;
  error?: string;
}

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function registrarUsuarioViaCompra(payload: CompraConfirmadaPayload): Promise<CompraConfirmadaResult> {
  if (payload.event !== "SALE_APPROVED") {
    return { ok: true };
  }
  const customer = payload.customer;
  if (!customer?.email || !customer?.document) {
    return { ok: false, error: "customer.email and customer.document are required" };
  }
  const email = String(customer.email).trim().toLowerCase();
  const cpf = formatCpfDigits(String(customer.document));
  const nome = customer.name?.trim() ?? "Usuário";

  if (!isValidEmail(email)) return { ok: false, error: "Invalid email" };
  if (!isValidCpf(cpf)) return { ok: false, error: "Invalid CPF" };

  const existing = await findUserByEmailOrCpf(email, cpf);
  if (existing) return { ok: true, created: false };

  const password = randomPassword();
  const senha_hash = await hashPassword(password);
  await createUser({ email, senha_hash, cpf, nome, role: "cliente" });

  if (process.env.NODE_ENV === "development") {
    console.log("[compra-confirmada] User created, credentials (dev only):", { email, password });
  }
  // TODO: send onboarding email with credentials via Resend or app email provider

  return { ok: true, created: true };
}
