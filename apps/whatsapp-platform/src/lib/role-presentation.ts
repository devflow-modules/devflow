/** Segmento de produto para filtros leves (gestão vs operação). */
export type TeamRoleSegment = "gestao" | "operacao";

export function teamRoleSegment(role: string | null | undefined): TeamRoleSegment {
  if (role === "operator") return "operacao";
  return "gestao";
}

/** Rótulo curto para UI — nunca mostrar o identificador técnico cru. */
export function friendlyRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case "operator":
      return "Operador";
    case "manager":
      return "Admin";
    case "platform_admin":
      return "Admin da plataforma";
    default:
      return "Membro da equipa";
  }
}

/** Uma linha de contexto: função na operação, não só o nome da role. */
export function roleScopeLine(role: string | null | undefined): string {
  switch (role) {
    case "operator":
      return "Atendimento e operação na inbox.";
    case "manager":
      return "Operação, métricas e configurações do tenant.";
    case "platform_admin":
      return "Acesso interno ampliado (equipa da plataforma).";
    default:
      return "Membro da equipa.";
  }
}
