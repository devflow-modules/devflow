# Repository Purity — Status (WhatsApp / CRM legado)

**Status:** `current`
**Última actualização:** 2026-08-04 (RP-3)
**Base de código (pré-RP-3 / SHA-base):** `main` @ `1154229974459b168db37f1accda04975b7de721`
**Audiência:** arquitectura, ops, agentes

Registo formal das decisões de pureza do repositório (passagens RP-1 → RP-3).

---

## 1. Matriz actual

| Alvo | Classificação | Notas |
|------|---------------|--------|
| Portal `src/`, `apps/whatsapp-platform`, `apps/financeiro` | **ACTIVE / RETAIN** | Deploys Vercel confirmados (RP-2b) |
| Callback Meta | **ACTIVE / RETAIN** | `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` (RP-2c-ext) |
| `notifyCrmIfLead` | **SUNSET ACCEPTED** | Removido com o app Express (RP-3); sem migração |
| `apps/whatsapp-webhook-api` | **RETIRED** | Remoção física no monorepo (RP-3 Draft); migrations históricas em archive |
| `apps/site` | **LEGACY / FREEZE / BLOCKED** | Fora das fatias RP; DORMANT neste team Vercel |
| DNS residual (subdomínios órfãos) | **PENDÊNCIA SEPARADA** | Aceite RP-2i; limpeza futura fora desta fatia |
| Banco / dados / migrations históricas | **PRESERVADOS** | Sem DROP; archive não executável |

---

## 2. Decisão SUNSET — `notifyCrmIfLead` (RP-2f)

### Texto da decisão

O POST externo de leads ao CRM executado por `notifyCrmIfLead` **não** faz parte da arquitectura canónica actual e **não** foi migrado para `apps/whatsapp-platform` nem substituído por `notifyExternalCrm` (portal). A capacidade ficou em **SUNSET** e o código foi retirado com o runtime Express na **RP-3**.

### Fundamentos (evidência)

1. Callback Meta aponta para o **whatsapp-platform** canónico (não para o Express).
2. `apps/whatsapp-webhook-api` estava **DORMANT** nos ambientes inventariados (sem projeto Vercel neste team; nunca hospedado noutro provider — RP-2i).
3. `notifyCrmIfLead` existia **somente** no pipeline Express legado.
4. CRM canónico actual: **Inbox / prospect** (platform) + **leads do portal**.
5. `notifyExternalCrm` **não** é substituto: helper sem callers de produto.
6. Migrar recriaria integração frágil **sem** necessidade comercial comprovada.

### Perda funcional aceita

- O POST HTTP opcional a `crmWebhookUrl` do tenant no inbound Express com intent `SALES`.

### Garantias (permanece a funcionar)

- Inbound/outbound WhatsApp no path Meta → platform.
- Inbox, prospect, leads portal, auth, billing e restantes superfícies canónicas.
- Nenhuma alteração ao Callback Meta nesta fatia.

---

## 3. RP-2g / RP-2h / RP-2i (resumo)

| Passagem | Resultado |
|----------|-----------|
| RP-2g | 0 callers internos; 0 CI/cron; schema Express desatualizado vs platform |
| RP-2h | 0 project Vercel Express no team verificado; DNS residual documentado; sem novas sondagens |
| RP-2i | CLOSED — operador único; host externo N/A; DNS residual aceite; DB preserve; rollback por PR |

---

## 4. RP-3 — RETIRED (implementação)

| Campo | Valor |
|-------|--------|
| Estado RP-3 | **IMPLEMENTED** (Draft PR — aguarda CI/revisão; **sem merge** nesta autorização) |
| App | `apps/whatsapp-webhook-api` → **RETIRED** |
| Migrations históricas | `docs/_archive/whatsapp-webhook-api-migrations/` (não executar) |
| Banco / dados | **Não** alterados; sem Prisma do legado; sem DROP |
| DNS / Meta / produção deploy | **Não** alterados |
| Rollback | Restaurar por PR a partir do SHA anterior à RP-3 (`11542299…`) |

---

## 5. Histórico curto das passagens

| Passagem | Resultado |
|----------|-----------|
| RP-1 | KEEP — repair documental canónico |
| RP-2 / 2b / 2c / 2c-ext | KEEP — inventário + Callback Meta confirmada |
| RP-2e | KEEP — gate SUNSET vs MIGRATE (recomendação SUNSET) |
| RP-2f | Registo formal SUNSET ACCEPTED |
| RP-2g / 2h / 2i | Inventário + gates solo → SAFE-TO-RETIRE |
| RP-3 | Remoção física do app (Draft; merge separado) |

---

## 6. Referências

- [CRM-ARCHITECTURE.md](../crm/CRM-ARCHITECTURE.md) §2.3
- [CURRENT-SCOPE.md](./CURRENT-SCOPE.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- Archive migrations: [docs/_archive/whatsapp-webhook-api-migrations/README.md](../_archive/whatsapp-webhook-api-migrations/README.md)
- Payload histórico: `packages/whatsapp-core` `buildExternalCrmLeadEventPayload` (contrato histórico; sem disparos canónicos)
