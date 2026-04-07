export type NavItem = { href: string; label: string; description?: string };

/** Navegação principal — frequência de uso (máx. 6). */
export const NAV_PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Painel", description: "Resumo e próximos passos" },
  { href: "/inbox", label: "Inbox", description: "Atendimento em tempo real" },
  { href: "/automation", label: "Automações", description: "Regras e IA" },
  { href: "/conversations", label: "Conversas", description: "Histórico e filas" },
  { href: "/settings/ai-analytics", label: "Análises", description: "Uso de IA e custos" },
];

/** Secundária — configuração e monetização. */
export const NAV_SECONDARY: NavItem[] = [
  { href: "/dashboard/whatsapp", label: "WhatsApp", description: "Estado da ligação" },
  { href: "/billing", label: "Cobrança", description: "Plano e faturação" },
  { href: "/settings", label: "Configurações", description: "Conta e preferências" },
];

/** Operação (não primária; ainda usada com frequência média). */
export const NAV_OPERATION: NavItem[] = [
  { href: "/agents", label: "Agentes" },
  { href: "/queues", label: "Filas" },
];

export const NAV_ADMIN = { href: "/admin/metrics", label: "Admin" };
