# Matriz de capacidades: backend (`plans.ts`) vs UI

## Fonte de verdade

| Camada | Ficheiro / função |
|--------|-------------------|
| Limites e flags | `modules/billing/plans.ts` → `PLANS` |
| Capacidades tipadas para UI | `getUiPlanCapabilities()` em `planUiCapabilities.ts` |
| Gating em runtime | `canUseFeature` / `assertFeature` em `featureGate.ts` (usa as mesmas flags) |
| Copy comercial | `planPresentation.ts` (deve estar alinhado com as flags acima) |

## Flags por plano (resumo)

| Plano | AUTOMATION | ADVANCED_AUTOMATION | QUEUES_TAGS | AI_RESPONSE | ADVANCED_AI | WEBHOOKS_API | ADVANCED_REPORTS | MULTI_USER |
|-------|------------|---------------------|-------------|-------------|-------------|--------------|------------------|------------|
| FREE | — | — | — | ✓ | — | — | — | — |
| STARTER | ✓ | — | — | ✓ | — | — | — | — |
| PRO | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| SCALE | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Regras de copy (UI)

- **Filas / tags / responsáveis operacionais**: só a partir do **Pro** (`QUEUES_TAGS`).
- **Automação “avançada” / fluxos ricos**: **Pro+** (`ADVANCED_AUTOMATION`). Starter tem só **AUTOMATION** básica.
- **IA avançada (modelo premium)**: só **Scale** (`ADVANCED_AI`).
- **API / webhooks**: só **Scale** (`WEBHOOKS_API`).
- **Relatórios avançados**: **Pro e Scale** (`ADVANCED_REPORTS`).
- **Vários utilizadores**: **Pro e Scale** (`MULTI_USER`).

## Enforcement

- APIs e serviços devem usar `requireFeatureOr403` / `assertFeature`; resposta JSON padronizada com `code: FEATURE_NOT_AVAILABLE`, `feature`, `currentPlan`, `requiredPlan`, `message` (ver `featureAccess.ts`).
- Outras áreas devem validar `QUEUES_TAGS` / `ADVANCED_AUTOMATION` nas rotas quando aplicável; a UI não deve prometer o que o backend não valida.

## Divergências corrigidas (sprint)

- Removida promessa genérica de “teste/pré-visualização” como capacidade de plano (não é flag em `plans.ts`).
- Starter: copy explicita “automação básica, sem filas”.
- Pro: não se vende “IA avançada” (flag `ADVANCED_AI`); Scale sim.
