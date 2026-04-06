# Execução controlada — migração de rotas (3 fases)

Complementa `ROUTING_POLICY.md` e `docs/site/MATRIZ-DECISAO-ROTAS.md`.  
Objetivo: **não quebrar produção** enquanto o monorepo ganha fronteiras claras.

---

## Fase 1 — SAFE (zero risco)

**Objetivo:** alinhar comportamento e parar o sangramento; **sem** mudar URL vista pelo usuário final (salvo redirects já acordados).

| # | Ação | Done |
|---|------|------|
| 1.1 | Publicar `ROUTING_POLICY.md` + este arquivo + registro `routing-governance.ts` | ☐ |
| 1.2 | Template de PR com checklist “dono da rota” | ☐ |
| 1.3 | Avisos em **dev** no middleware para rotas Fase 2 (ver console) | ☐ |
| 1.3b | Job **Routing governance** no CI + marcar como **required** no GitHub (branch protection) | ☐ |
| 1.4 | Marcar na matriz cada linha com **fase** (1/2/3) alinhada ao registro em código | ☐ |
| 1.5 | Comunicar no canal do time: **congelar** novas features em `apps/site` e novas telas operacionais de Financeiro na raiz | ☐ |
| 1.6 | Opcional: redirects **internos** só onde canônico já é o mesmo host (evitar redirect cross-domain sem env) | ☐ |

**Resultado esperado:** produção idêntica; equipe com regra explícita; dívida não aumenta.

---

## Próximo valor após Fase 1

**Épico Financeiro (cutover portal × `apps/financeiro`):** `docs/architecture/EPICO-FINANCEIRO-CUTOVER.md` — canon, rotas na raiz vs app, redirects, `/billing`. **PR 1 (plano técnico):** `PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md`. **Runbook na `main`:** `CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md`. É o primeiro domínio a mover “de verdade” após o gate de CI.

**Fase 1.5 (futura, opcional):** validação semântica no CI (ex.: prefixo `ferramentas/financeiro` ↔ registro em `routing-governance.ts`). Não é pré-requisito do cutover.

---

## Fase 2 — MIGRAÇÃO CONTROLADA

**Objetivo:** mover **responsabilidade real** (tráfego e/ou código) para o app dono.

| # | Ação | Done |
|---|------|------|
| 2.1 | Definir URLs canônicas de produção para `apps/financeiro` (`NEXT_PUBLIC_FINANCEIRO_APP_URL` — ver `PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md`) | ☐ |
| 2.2 | Cutover Financeiro: `auth`, `onboarding`, `dashboard`, `expenses`, … — **301** ou rewrite de borda | ☐ |
| 2.3 | `/billing` e `/upgrade` — dono `apps/financeiro`; raiz com redirect ou página “continuar no app” | ☐ |
| 2.4 | `/dashboard/whatsapp*` na raiz — **308** / remoção; canónico no `apps/whatsapp-platform` | ✅ |
| 2.5 | APIs `/api/me`, expenses, billing… — mover com o app ou proxy documentado até cutover | ☐ |
| 2.6 | Revisar `/admin/metrics` na raiz — dono único (produto vs portal) | ☐ |

**Resultado esperado:** usuário passa a bater no app certo; raiz mais “portal”.

---

## Fase 3 — LIMPEZA FINAL

**Objetivo:** remover legado e duplicação de código.

| # | Ação | Done |
|---|------|------|
| 3.1 | `apps/site` — fundir na raiz e **remover** pacote ou arquivar repo | ☐ |
| 3.2 | Apagar da raiz rotas operacionais já migradas (páginas + APIs órfãs) | ☐ |
| 3.3 | Atualizar inventário e matriz (status → **ok**) | ☐ |
| 3.4 | Desligar avisos de depreciação ou convertê-los em erro em dev se desejado | ☐ |

**Resultado esperado:** monorepo com fronteiras de produto alinhadas ao deploy.

---

## Ordem recomendada (resumo)

1. Fase 1 completa antes de 301 em massa.  
2. Financeiro antes de WhatsApp na raiz (maior superfície de usuário).  
3. `apps/site` por último ou em paralelo ao marketing, sem novas rotas.

---

## Rollback

Cada cutover deve ter: feature flag ou reversão de redirect na borda (Vercel/nginx) em minutos, não em dias.

---

*Atualize as colunas Done na revisão de sprint ou epic correspondente.*
