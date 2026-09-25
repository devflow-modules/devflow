import Link from "next/link";

import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";

export function DashboardPersistenceNotice({
  kind,
}: {
  kind: "migration_required" | "auth_required" | "error";
}) {
  if (kind === "migration_required") {
    return (
      <ApplyFlowCard variant="muted" padding="lg">
        <p className="text-sm font-medium text-[color:var(--af-text)]">Migração necessária</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          A persistência na conta está ativa, mas este navegador ainda tem vagas ou candidaturas locais.
          Esses dados não foram migrados, então o painel não troca o histórico local por uma lista vazia.
          Nada foi apagado deste navegador e nada foi enviado para a conta.
        </p>
      </ApplyFlowCard>
    );
  }

  if (kind === "auth_required") {
    return (
      <ApplyFlowCard variant="muted" padding="lg">
        <p className="text-sm font-medium text-[color:var(--af-text)]">Entre na conta para continuar</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          A persistência na conta precisa de uma sessão. O painel anônimo local continua disponível quando essa
          opção está desligada.
        </p>
        <Link href="/login" className="mt-3 inline-block text-sm text-emerald-300 hover:text-emerald-200">
          Entrar
        </Link>
      </ApplyFlowCard>
    );
  }

  return (
    <ApplyFlowCard variant="muted" padding="lg">
      <p className="text-sm font-medium text-[color:var(--af-text)]">Não foi possível carregar a conta</p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
        Os dados locais não foram alterados. Tente outra vez quando a conta responder.
      </p>
    </ApplyFlowCard>
  );
}

export const V2_LOCAL_IMPORT_BLOCKED =
  "A importação local não grava na persistência da conta. A migração ainda não está disponível.";

export function dashboardPersistenceFailureMessage(code: string): string {
  if (code === "version_conflict") {
    return "Outra alteração foi gravada antes desta. Recarregue o painel antes de tentar de novo.";
  }
  if (code === "application_already_exists_for_job") {
    return "Já existe uma candidatura para esta vaga.";
  }
  if (code === "job_already_exists" || code === "application_already_exists") {
    return "Esse registro já existe na conta.";
  }
  if (code === "invalid_status_transition") {
    return "Essa mudança de estágio não é permitida.";
  }
  if (code === "unauthenticated" || code === "auth_not_configured") {
    return "É preciso entrar na conta para gravar.";
  }
  return "Não foi possível gravar na conta.";
}
