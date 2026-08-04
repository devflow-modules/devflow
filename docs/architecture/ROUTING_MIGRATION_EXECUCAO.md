# Execução controlada — migração de rotas (3 fases)

Complementa `ROUTING_POLICY.md` e `docs/site/MATRIZ-DECISAO-ROTAS.md`.
Objetivo: **não quebrar produção** enquanto o monorepo ganha fronteiras claras.

**Actualização RP-1 (2026-08-04):** checkboxes abaixo reflectem **evidência no código/repo** em `main` @ `bb7c7584`.
Estado de **deploy Vercel / tráfego real** de `apps/site` e hosts Financeiro **não** foi verificado nesta fatia (fica bloqueado para verificação externa).

---

## Fase 1 — SAFE (zero risco)

**Objetivo:** alinhar comportamento e parar o sangramento; **sem** mudar URL vista pelo usuário final (salvo redirects já acordados).

| # | Ação | Done |
|---|------|------|
| 1.1 | Publicar `ROUTING_POLICY.md` + este arquivo + registro `routing-governance.ts` | ✅ |
| 1.2 | Template de PR com checklist “dono da rota” | ✅ (`.github/pull_request_template.md`) |
| 1.3 | Avisos em **dev** no middleware para rotas Fase 2 (ver console) | ✅ (`src/lib/routing-governance.ts` + proxy/middleware) |
| 1.3b | Job **Routing governance** no CI + marcar como **required** no GitHub (branch protection) | ✅ job existe (`.github/workflows/routing-governance-check.yml`); **required** no branch protection = confirmar no GitHub (fora desta fatia) |
| 1.4 | Marcar na matriz cada linha com **fase** (1/2/3) alinhada ao registro em código | ✅ parcial — matriz + `routing-governance.ts` alinhados para Financeiro/WhatsApp cutover; rever linhas órfãs na próxima passagem |
| 1.5 | Comunicar no canal do time: **congelar** novas features em `apps/site` e novas telas operacionais de Financeiro na raiz | ✅ documental (`AGENTS.md` / ARCHITECTURE / site README); comunicação humana = fora de repo |
| 1.6 | Opcional: redirects **internos** só onde canônico já é o mesmo host (evitar redirect cross-domain sem env) | ✅ cutover via env (`NEXT_PUBLIC_*_APP_URL`) |

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
| 2.1 | Definir URLs canônicas de produção para `apps/financeiro` (`NEXT_PUBLIC_FINANCEIRO_APP_URL` — ver `PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md`) | ✅ no código (`packages/financeiro-routes`, portal); valor de produção no Vercel = verificação externa |
| 2.2 | Cutover Financeiro: `auth`, `onboarding`, `dashboard`, `expenses`, … — redirect quando env definida | ✅ paths operacionais classificados phase 3 + `getFinanceiroCutoverRedirectUrl` / proxy |
| 2.3 | `/billing` e `/upgrade` — dono `apps/financeiro`; raiz com redirect quando `NEXT_PUBLIC_FINANCEIRO_APP_URL` | ✅ (`routing-governance` + páginas portal) |
| 2.4 | `/dashboard/whatsapp*` na raiz — **308** / remoção; canónico no `apps/whatsapp-platform` | ✅ |
| 2.5 | APIs `/api/me`, expenses, billing… — mover com o app ou proxy documentado até cutover | ✅ parcial — governança phase 3; inventário fino de APIs residuais = UPDATE futuro |
| 2.6 | Revisar `/admin/metrics` na raiz — dono único (produto vs portal) | ☐ ainda aberto (não reclassificado sem inventário dedicado) |

**Resultado esperado:** usuário passa a bater no app certo; raiz mais “portal”.

---

## Fase 3 — LIMPEZA FINAL

**Objetivo:** remover legado e duplicação de código.

| # | Ação | Done |
|---|------|------|
| 3.1 | `apps/site` — fundir na raiz e **remover** pacote ou arquivar repo | ☐ **BLOCKED** — ARCHIVE até verificar deploy/domínio (Purity RP-2+) |
| 3.2 | Apagar da raiz rotas operacionais já migradas (páginas + APIs órfãs) | ☐ parcial — redirects activos; limpeza física = fatia posterior |
| 3.3 | Atualizar inventário e matriz (status → **ok**) | ☐ em curso (esta fatia actualiza este runbook; matriz completa = UPDATE futuro) |
| 3.4 | Desligar avisos de depreciação ou convertê-los em erro em dev se desejado | ☐ |

**Resultado esperado:** monorepo com fronteiras de produto alinhadas ao deploy.

---

## Ordem recomendada (resumo)

1. Fase 1 completa antes de 301 em massa.
2. Financeiro antes de WhatsApp na raiz (maior superfície de usuário) — **código de cutover Financeiro+WhatsApp já presente**.
3. `apps/site` por último ou em paralelo ao marketing, sem novas rotas — **ainda BLOCKED**.

---

## Rollback

Cada cutover deve ter: feature flag ou reversão de redirect na borda (Vercel/nginx) em minutos, não em dias.

---

*Actualizado em RP-1 Canonical Documentation Repair (2026-08-04). Não implica verificação de tráfego Vercel.*
