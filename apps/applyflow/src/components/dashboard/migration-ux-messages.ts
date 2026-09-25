import type { MigrationCoordinatorErrorCode } from "@/lib/persistence-v2/migration/migration-coordinator";
import type { MigrationPrepareErrorCode } from "@/lib/persistence-v2/migration/migration-prepare";

const PREPARE_MESSAGES: Record<MigrationPrepareErrorCode, string> = {
  legacy_unreadable:
    "Não foi possível ler os dados locais deste navegador. Nada foi enviado nem apagado. Recupere o armazenamento local antes de migrar.",
  legacy_partial_or_malformed:
    "Os dados locais estão incompletos ou inválidos. A migração não continua com um subconjunto. Nada foi enviado nem apagado — recupere os dados locais antes de tentar de novo.",
  duplicate_id:
    "Há identificadores duplicados nos dados locais. Corrija ou recupere o armazenamento antes de migrar. Nada foi enviado nem apagado.",
  migration_dataset_too_large:
    "Este conjunto de dados é maior do que a migração atual consegue processar com segurança (até 50 vagas e 50 candidaturas). Nada foi enviado, truncado nem apagado.",
};

const COORDINATOR_MESSAGES: Record<MigrationCoordinatorErrorCode, string> = {
  auth_required: "A sessão expirou. Entre na conta para retomar a migração. Os dados locais não foram apagados.",
  auth_not_configured:
    "A autenticação da conta não está disponível neste momento. Os dados locais não foram alterados.",
  legacy_unreadable: PREPARE_MESSAGES.legacy_unreadable,
  legacy_partial_or_malformed: PREPARE_MESSAGES.legacy_partial_or_malformed,
  duplicate_id: PREPARE_MESSAGES.duplicate_id,
  migration_dataset_too_large: PREPARE_MESSAGES.migration_dataset_too_large,
  migration_api_failed:
    "Não foi possível concluir a migração na conta. Os dados locais permanecem intactos. Pode tentar novamente.",
  migration_conflict:
    "A migração não foi finalizada. Os dados já existentes na conta não foram sobrescritos. Os dados locais deste navegador permanecem intactos.",
  completion_proof_invalid:
    "A confirmação da migração na conta não pôde ser validada. Os dados locais não foram apagados. Tente novamente.",
  marker_write_failed:
    "A migração na conta foi concluída, mas o navegador não confirmou o corte. Tente novamente — nada será duplicado e os dados locais permanecem intactos.",
  network: "Falha de rede durante a migração. Os dados locais não foram alterados. Tente novamente.",
  server: "A conta não respondeu durante a migração. Os dados locais não foram alterados. Tente novamente.",
};

export function migrationPrepareUserMessage(code: MigrationPrepareErrorCode): string {
  return PREPARE_MESSAGES[code];
}

export function migrationCoordinatorUserMessage(code: MigrationCoordinatorErrorCode): string {
  return COORDINATOR_MESSAGES[code];
}

export function isMigrationRetrySafe(code: MigrationCoordinatorErrorCode | MigrationPrepareErrorCode): boolean {
  return (
    code === "migration_api_failed" ||
    code === "completion_proof_invalid" ||
    code === "marker_write_failed" ||
    code === "network" ||
    code === "server" ||
    code === "auth_required" ||
    code === "auth_not_configured"
  );
}

export function isMigrationBlockedPrepare(code: MigrationPrepareErrorCode): boolean {
  return (
    code === "migration_dataset_too_large" ||
    code === "legacy_partial_or_malformed" ||
    code === "legacy_unreadable" ||
    code === "duplicate_id"
  );
}
