# Repository Purity — Status (WhatsApp / CRM legado)

**Status:** `current`
**Última actualização:** 2026-08-04
**Base de código:** `main` @ `899dcb98e1bef345b9d8f985a456f212aea66955`
**Audiência:** arquitectura, ops, agentes

Registo formal das decisões de pureza do repositório (passagens RP-1 → RP-2f). **Não** autoriza exclusão física nem RP-3.

---

## 1. Matriz actual

| Alvo | Classificação | Notas |
|------|---------------|--------|
| Portal `src/`, `apps/whatsapp-platform`, `apps/financeiro` | **ACTIVE / RETAIN** | Deploys Vercel confirmados (RP-2b) |
| Callback Meta | **ACTIVE / RETAIN** | `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` (RP-2c-ext) |
| `notifyCrmIfLead` | **SUNSET ACCEPTED** | Decisão humana RP-2e/f — sem migração; ver §2 |
| `apps/whatsapp-webhook-api` | **PREPARE-RETIREMENT** | DORMANT nos ambientes verificados; **não** SAFE-TO-RETIRE |
| `apps/site` | **LEGACY / FREEZE / BLOCKED** | Fora das fatias RP-2e/f; DORMANT neste team Vercel |
| Qualquer alvo **SAFE-TO-RETIRE** | **nenhum** | RP-3 não autorizada |

---

## 2. Decisão SUNSET — `notifyCrmIfLead` (RP-2f)

### Texto da decisão

O POST externo de leads ao CRM executado por `notifyCrmIfLead` **não** faz parte da arquitectura canónica actual e **não** será migrado para `apps/whatsapp-platform` nem substituído por `notifyExternalCrm` (portal). A capacidade fica em **SUNSET**: permanece no código do runtime Express apenas até à **retirada controlada futura** de `apps/whatsapp-webhook-api`, após verificação das restantes dependências.

### Fundamentos (evidência)

1. Callback Meta aponta para o **whatsapp-platform** canónico (não para o Express).
2. `apps/whatsapp-webhook-api` está **DORMANT** nos ambientes inventariados (sem projeto Vercel neste team; path Express 404 no host WA).
3. `notifyCrmIfLead` existe **somente** no pipeline Express legado (`WebhookController.ts`).
4. CRM canónico actual: **Inbox / prospect** (platform) + **leads do portal** — não o POST externo do Express.
5. `notifyExternalCrm` **não** é substituto: helper sem callers de produto.
6. Migrar recriaria integração frágil **sem** necessidade comercial comprovada.

### Perda funcional aceita

- O POST HTTP opcional a `crmWebhookUrl` do tenant no inbound Express com intent `SALES`.

### Garantias (permanece a funcionar)

- Inbound/outbound WhatsApp no path Meta → platform.
- Inbox, prospect, leads portal, auth, billing e restantes superfícies canónicas.
- Nenhuma alteração ao Callback Meta nesta fatia.

### O que ainda **não** foi feito

- Remoção do código `notifyCrmIfLead`.
- Remoção, archive físico ou freeze Turbo de `apps/whatsapp-webhook-api`.
- Queries a `crm_webhook_url` na base.
- Inventário de outros provedores/hosts/teams.

---

## 3. Evidência ainda ausente (bloqueios a SAFE-TO-RETIRE)

Antes de classificar `apps/whatsapp-webhook-api` como **SAFE-TO-RETIRE** ou autorizar RP-3:

| Lacuna | Porquê importa |
|--------|----------------|
| Outros teams Vercel / contas | Pode existir projecto não inventariado |
| Outros provedores (Railway, Render, Fly, VM) | Express pode estar fora do Vercel |
| Jobs / consumidores externos | Cron ou clientes HTTP ao legado |
| Dependências internas do app | Prisma paralelo, scripts, docs, testes, workspace |
| Aceite explícito pós-checklist | Gate humano final de retirada |

---

## 4. Gate antes de RP-3

1. Completar inventário das lacunas §3 (fatia de verificação dedicada).
2. Confirmar que **nenhuma** dependência activa resta no Express.
3. Autorização humana explícita: `AUTORIZADO RP-3` com alvos e critérios SAFE-TO-RETIRE.

Até lá: **PREPARE-RETIREMENT** apenas — planear, documentar, **não** apagar.

---

## 5. Histórico curto das passagens

| Passagem | Resultado |
|----------|-----------|
| RP-1 | KEEP — repair documental canónico |
| RP-2 / 2b / 2c / 2c-ext | KEEP — inventário + Callback Meta confirmada |
| RP-2e | KEEP — gate SUNSET vs MIGRATE (recomendação SUNSET) |
| RP-2f | Registo formal SUNSET ACCEPTED (este documento) |

---

## 6. Referências

- [CRM-ARCHITECTURE.md](../crm/CRM-ARCHITECTURE.md) §2.3
- [CURRENT-SCOPE.md](./CURRENT-SCOPE.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- Payload: `packages/whatsapp-core` `buildExternalCrmLeadEventPayload` (contrato histórico; sem novos disparos canónicos)
