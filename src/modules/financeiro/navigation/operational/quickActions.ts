import { FINANCEIRO_BASE_PATH } from "../constants";

export type FinanceiroQuickActionType =
  | "new_expense"
  | "new_income"
  | "month_summary"
  | "rules"
  | "categories"
  | "account";

export type FinanceiroQuickAction = {
  action_type: FinanceiroQuickActionType;
  label: string;
  href: string;
  description: string;
};

const B = FINANCEIRO_BASE_PATH;

export function getFinanceiroQuickActions(role: "OWNER" | "MEMBER" | null | undefined): FinanceiroQuickAction[] {
  const base: FinanceiroQuickAction[] = [
    {
      action_type: "new_expense",
      label: "Nova despesa",
      href: `${B}/expenses#nova-despesa`,
      description: "Registrar saída",
    },
    {
      action_type: "new_income",
      label: "Nova receita",
      href: `${B}/expenses#nova-receita`,
      description: "Registrar entrada",
    },
    {
      action_type: "month_summary",
      label: "Resumo do mês",
      href: `${B}/dashboard#resumo-mes`,
      description: "Totais e saldo",
    },
  ];

  if (role === "MEMBER") {
    return [
      ...base,
      {
        action_type: "account",
        label: "Minha conta",
        href: `${B}/settings`,
        description: "Perfil e casa",
      },
      {
        action_type: "categories",
        label: "Categorias",
        href: `${B}/expenses#categorias`,
        description: "Campo categoria nas despesas",
      },
    ].slice(0, 5);
  }

  return [
    ...base,
    {
      action_type: "rules",
      label: "Regras automáticas",
      href: `${B}/rules`,
      description: "Alocações e divisão",
    },
    {
      action_type: "categories",
      label: "Categorias",
      href: `${B}/expenses#categorias`,
      description: "Classificar despesas",
    },
  ].slice(0, 5);
}
