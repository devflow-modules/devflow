/**
 * Mode-aware persistence privacy copy for ApplyFlow dashboard notices.
 * Driven by authoritative server mode — never invents localStorage as canonical for v2_cloud.
 */

export type ApplyFlowPersistencePrivacyMode =
  | "v1"
  | "v2_offering"
  | "v2_active"
  | "v2_read_only"
  | "v2_paused";

export type ApplyFlowPersistencePrivacyCopy = {
  title: string;
  body: string;
  /** Optional highlighted storage label (e.g. localStorage) — only for true V1 messaging. */
  storageLabel?: "localStorage";
};

const COPY: Record<ApplyFlowPersistencePrivacyMode, ApplyFlowPersistencePrivacyCopy> = {
  v1: {
    title: "Os teus dados ficam neste browser",
    body: "Perfil, vagas e candidaturas locais ficam neste dispositivo durante a descoberta. O ApplyFlow não envia o teu currículo aos provedores de busca. Importações e a demo ficam guardadas localmente até limpares os dados do site.",
    storageLabel: undefined,
  },
  v2_offering: {
    title: "Conta pronta para sincronização",
    body: "Podes manter dados neste navegador ou ativar/migrar para a persistência na nuvem da conta. A decisão é explícita — o browser não promove dados locais sozinho.",
  },
  v2_active: {
    title: "Dados da conta na nuvem",
    body: "Vagas e candidaturas desta conta são gravadas na nuvem (servidor ApplyFlow). Um eventual backup neste navegador não é a fonte canónica.",
  },
  v2_read_only: {
    title: "Conta em modo leitura",
    body: "Os dados na nuvem continuam disponíveis para consulta. Alterações estão temporariamente desativadas. O armazenamento local não substitui a fonte canónica.",
  },
  v2_paused: {
    title: "Persistência na nuvem temporariamente indisponível",
    body: "Os dados da conta não podem ser carregados neste momento. O backup local deste navegador não foi usado como substituto e não foi alterado.",
  },
};

export function persistencePrivacyCopyForMode(
  mode: ApplyFlowPersistencePrivacyMode,
): ApplyFlowPersistencePrivacyCopy {
  return COPY[mode];
}

/**
 * Derive dashboard privacy mode from client bootstrap flags already driven by the server.
 */
export function resolveDashboardPrivacyMode(input: {
  usesCloudPersistence: boolean;
  writeCapability: "full" | "read_only";
  emptyActivationEligible: boolean;
  activationPendingNotice: boolean;
}): ApplyFlowPersistencePrivacyMode {
  if (input.usesCloudPersistence) {
    return input.writeCapability === "read_only" ? "v2_read_only" : "v2_active";
  }
  if (input.emptyActivationEligible || input.activationPendingNotice) {
    return "v2_offering";
  }
  return "v1";
}
