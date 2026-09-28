import Link from "next/link";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";

export function DashboardPersistenceNotice({
  kind,
  onRetry,
}: {
  kind:
    | "migration_required"
    | "auth_required"
    | "error"
    | "paused"
    | "bootstrap_unavailable";
  onRetry?: () => void;
}) {
  // Primary migration UX lives in DashboardMigrationPanel; this is a safe fallback.
  if (kind === "migration_required") {
    return (
      <ApplyFlowCard variant="muted" padding="lg">
        <p className="text-sm font-medium text-[color:var(--af-text)]">Migração necessária</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          Foram detectados dados locais. Use o fluxo de migração para copiar vagas e candidaturas para a
          conta. Nada foi apagado deste navegador.
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

  if (kind === "paused") {
    return (
      <ApplyFlowCard variant="muted" padding="lg" data-testid="persistence-paused-notice">
        <p className="text-sm font-medium text-[color:var(--af-text)]">
          Persistência na nuvem temporariamente indisponível
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          Os dados da conta não podem ser carregados neste momento. O backup local deste navegador não foi
          usado como substituto e não foi alterado. Tente atualizar a página mais tarde.
        </p>
        {onRetry ? (
          <ApplyFlowButton type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
            Tentar de novo
          </ApplyFlowButton>
        ) : null}
      </ApplyFlowCard>
    );
  }

  if (kind === "bootstrap_unavailable") {
    return (
      <ApplyFlowCard variant="muted" padding="lg" data-testid="persistence-bootstrap-unavailable">
        <p className="text-sm font-medium text-[color:var(--af-text)]">Estado de persistência indefinido</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          Não foi possível confirmar o modo de persistência no servidor. Os dados locais não foram usados
          automaticamente para evitar mostrar informação desatualizada.
        </p>
        {onRetry ? (
          <ApplyFlowButton type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
            Tentar de novo
          </ApplyFlowButton>
        ) : null}
      </ApplyFlowCard>
    );
  }

  return (
    <ApplyFlowCard variant="muted" padding="lg">
      <p className="text-sm font-medium text-[color:var(--af-text)]">Não foi possível carregar a conta</p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
        Os dados locais não foram alterados. Tente outra vez quando a conta responder.
      </p>
      {onRetry ? (
        <ApplyFlowButton type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Tentar de novo
        </ApplyFlowButton>
      ) : null}
    </ApplyFlowCard>
  );
}

export function DashboardPersistenceReadOnlyBanner() {
  return (
    <ApplyFlowCard variant="muted" padding="md" data-testid="persistence-read-only-banner">
      <p className="text-sm font-medium text-[color:var(--af-text)]">Conta em modo leitura</p>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
        Pode consultar vagas e candidaturas na nuvem. Alterações estão desativadas neste momento.
      </p>
    </ApplyFlowCard>
  );
}

export const V2_LOCAL_IMPORT_BLOCKED =
  "A importação local não grava na persistência da conta. A migração ainda não está disponível.";

export const V2_READ_ONLY_BLOCKED =
  "Esta conta está em modo leitura. Alterações na nuvem estão desativadas.";

export function dashboardPersistenceFailureMessage(code: string): string {
  if (code === "read_only") {
    return V2_READ_ONLY_BLOCKED;
  }
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
