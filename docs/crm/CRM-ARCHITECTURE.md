# Arquitetura CRM — DevFlow (monorepo)

Documento oficial de alinhamento: **fonte de verdade**, camadas auxiliares e integrações.

---

## 1. Auditoria estrutural (mapa)

| Origem | Onde vive | Quem usa | Persistência | Fonte de verdade? |
|--------|-----------|----------|----------------|-------------------|
| **CRM operacional (Inbox)** | `apps/whatsapp-platform` — `WaInboxThread` (`leadScore`, `leadData`, `priority`, `status`), `modules/inbox/leadCrm.ts`, UI (`LeadDataPanel`, `ConversationItem`, `ChatWindow`, `DashboardAiClient`) | `operator`, `manager`, `platform_admin` (operação tenant); prospecção DevFlow extra só `platform_admin` quando `NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED` | BD **WhatsApp Platform** (Prisma `apps/whatsapp-platform/prisma`) | **Sim** — estado operacional do cliente e da conversa |
| **CRM outbound interno (Portal)** | `src/app/admin/leads/**`, `src/app/api/admin/leads/**`, `src/lib/outbound-lead-origins.ts`, `src/lib/lead-operator-service.ts`, `src/lib/crm-sync.ts` | **Apenas equipa DevFlow** (`platform_admin` + segredo admin em prod para automação legada) | BD **portal** (`Lead` / `outbound_leads` no `prisma/schema.prisma` raiz) | **Não** — pipeline comercial interno; ponte via `conversationRef` → `thread.id` |
| **Integração CRM externa (Webhook)** | **SUNSET ACCEPTED (RP-2f).** Código legado: `notifyCrmIfLead` só em `apps/whatsapp-webhook-api`. Payload histórico: `@devflow/whatsapp-core` `buildExternalCrmLeadEventPayload`. **Não** migrar para platform; **não** tratar `notifyExternalCrm` (portal, sem callers de produto) como substituto. CRM canónico = Inbox/prospect + leads portal | — | — | **Não** — fora da arquitectura canónica; ver [REPOSITORY-PURITY-STATUS.md](../whatsapp-platform/REPOSITORY-PURITY-STATUS.md) |

---

## 2. Modelo oficial em três camadas

### 2.1 CRM operacional (Inbox) — fonte de verdade

- Conversa, mensagens, SLA, atribuição, score e `lead_data` JSON.
- Recalculo de score / prioridade: `refreshThreadLeadCrmAfterInbound` em `leadCrm.ts`.
- Estados derivados: `waInboxConversationState.ts`; fase comercial resumida: `deriveOperationalCrmPhase` em `leadCrm.ts` (rótulos PT).

### 2.2 CRM outbound interno (Portal) — auxiliar DevFlow

- Leads manuais / Lead Finder / inbound site / demo.
- Campo **`conversationRef`**: UUID da thread WhatsApp Platform (liga lead ↔ conversa).
- **Não** expor como produto white-label; copy: **“Prospecção DevFlow”** / **“Prospecção interna DevFlow”**.
- Helpers de sincronização: `src/lib/crm-sync.ts` (`linkLeadToThread`, `createLeadFromConversation`, `notifyExternalCrm`).

### 2.3 Integração CRM externa — SUNSET (não canónica)

**Decisão (2026-08-04, RP-2f):** **SUNSET ACCEPTED** — sem migração para `whatsapp-platform`.

- O POST externo (`notifyCrmIfLead`, intent `SALES` + `crmWebhookUrl`) existia **apenas** no pipeline Express (`apps/whatsapp-webhook-api`).
- Callback Meta canónico: `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` → **platform**; o Express **não** recebe esse tráfego nos ambientes verificados.
- **Perda aceita:** esse POST CRM externo do pipeline legado.
- **Não afectado:** mensagens WhatsApp no path canónico; Inbox/prospect; leads portal.
- `notifyExternalCrm` no portal **não** substitui esta capacidade (helper sem callers de produto).
- Código legado **ainda não removido**; retirada física do app = **PREPARE-RETIREMENT**, gate em [REPOSITORY-PURITY-STATUS.md](../whatsapp-platform/REPOSITORY-PURITY-STATUS.md) antes de RP-3.

Payload histórico (referência apenas): `source: "devflow_whatsapp"` via `buildExternalCrmLeadEventPayload`. **Não** altera threads, leads nem mensagens internas.

---

## 3. Regras de sincronização

1. **Lead ↔ conversa (bidirecional)**
   - Portal: `Lead.conversationRef` = `wa_inbox_threads.id`.
   - WhatsApp Platform: `WaInboxThread.outboundLeadId` = `Lead.id` (referência **cross-BD**, sem FK; ver migração `20260430190000_wa_thread_outbound_lead_id`).
   - Helpers: `linkLeadToThread` e `createLeadFromConversation` em `src/lib/crm-sync.ts` atualizam **os dois lados** quando a BD WhatsApp está configurada.

2. **Conversa sem lead outbound**
   - Hoje: criação manual / `createLeadFromConversation` sob demanda.
   - **Futuro:** inbound → dedupe → create/update — ver [CRM-DEDUPE-AND-PORTAL-LINK.md](./CRM-DEDUPE-AND-PORTAL-LINK.md) (política e pré-requisito `tenantId` em `Lead`).

3. **Webhook externo (legado / SUNSET)**
   - `notifyCrmIfLead` (Express) e `notifyExternalCrm` (portal helper): envio HTTP sem side-effects na BD DevFlow.
   - **Canónico:** não disparar POST CRM externo no inbound Meta do platform. Detalhe: [REPOSITORY-PURITY-STATUS.md](../whatsapp-platform/REPOSITORY-PURITY-STATUS.md).

---

## 4. Modelo mínimo comum (conceitual)

**Lead (portal)**
`id`, `name`, `phone`, `origin`, `status`, `assignedOperatorId` (owner), `notes`, `conversationRef?` (thread id)

**Conversation / thread (WhatsApp Platform)**
`id`, `phoneNumber`, `leadScore`, `leadData`, `status` (OPEN/PENDING/CLOSED), `assignedToUserId` (owner operacional)

---

## 5. UX e nomenclatura

| Contexto | Termo |
|----------|--------|
| Inbox | “Contexto do cliente”, “Prioridade CRM”, “Próxima ação” |
| Portal `/admin/leads` | “Prospecção DevFlow” / “Prospecção interna DevFlow” |
| Webhook | Documentar como “integração externa”; não como CRM principal |

---

## 6. Referências

- Detalhe operacional leads portal: [`LEADS-CRM.md`](./LEADS-CRM.md)
- Playbook prospecção inbox (**canónico**): [`../whatsapp/PROSPECT_CRM_PLAYBOOK.md`](../whatsapp/PROSPECT_CRM_PLAYBOOK.md)
- Narrativa commercial (secundário): [`../commercial/PROSPECTING_CRM_PLAYBOOK.md`](../commercial/PROSPECTING_CRM_PLAYBOOK.md)
- Dono do lead: [`LEAD-OWNERSHIP.md`](./LEAD-OWNERSHIP.md)
- Registo pureza / SUNSET CRM externo: [`../whatsapp-platform/REPOSITORY-PURITY-STATUS.md`](../whatsapp-platform/REPOSITORY-PURITY-STATUS.md)
