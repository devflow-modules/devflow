export type UserRole = "cliente" | "operador" | "admin";

export interface User {
  id: string;
  email: string;
  senha_hash: string;
  cpf: string;
  nome: string | null;
  telefone: string | null;
  nascimento: string | null;
  cidade: string | null;
  uf: string | null;
  genero: string | null;
  role: UserRole;
  bonus_concedido_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ConsultaStatus = "Pendente" | "Consultado" | "Erro";

export interface Consulta {
  id: string;
  cpf: string;
  cnpj: string;
  nome: string | null;
  status: ConsultaStatus;
  criado_em: string;
}

export interface DadosCnpj {
  cnpj: string;
  dados: Record<string, unknown>;
  updated_at: string;
}

export interface UserSafe {
  id: string;
  email: string;
  cpf: string;
  nome: string | null;
  role: UserRole;
}
