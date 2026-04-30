# Dedupe de leads, `outboundLeadId` na thread e automação inbound

Este documento fixa **decisões em aberto** e o **caminho inevitável** para o produto comercial (sem implementar ainda o worker automático completo).

---

## 1. Duas bases de dados (regra estrutural)

| Sistema | BD | Modelo |
|---------|-----|--------|
| WhatsApp Platform (inbox) | `WHATSAPP_DATABASE_URL` / `WHATSAPP_DIRECT_URL` | `WaInboxThread` |
| Portal prospecção | `DATABASE_URL` (Prisma raiz) | `Lead` (`outbound_leads`) |

Não existe **FK PostgreSQL** entre `wa_inbox_threads` e `outbound_leads`. A ponte é:

- `Lead.conversationRef` → `wa_inbox_threads.id`
- `WaInboxThread.outboundLeadId` → `Lead.id` (campo novo; espelho para queries e métricas no lado WhatsApp)

Manter **os dois lados** atualizados ao ligar (ver `src/lib/crm-sync.ts`: `linkLeadToThread`, `createLeadFromConversation`).  
O `PATCH /api/admin/leads/:id` com `conversationRef` chama `mirrorOutboundLeadIdToThread` para limpar o `outbound_lead_id` da thread antiga e gravar na nova.

---

## 2. `outboundLeadId` (= o “`thread.leadId`” de produto)

No código Prisma o campo chama‑se **`outboundLeadId`** (`outbound_lead_id` na tabela) para não colidir com a noção de “lead” operacional (`leadScore` / `leadData`). **Semântica:** é o **`Lead.id`** do portal — o que a equipa chama de *leadId* no funil comercial.

- **Nome Prisma:** `outboundLeadId` (`outbound_lead_id` na tabela) — evita confusão com “lead” operacional (`leadScore` / `leadData`).
- **Semântica:** CUID do registo `Lead` no portal.
- **Uso:** funil, relatórios no warehouse da app WhatsApp, joins lógicos em ETL, UI admin futura “abrir lead”.

---

## 3. Política de dedupe (proposta para quando automatizar inbound)

### 3.1 Chave natural mínima (recomendada)

1. **Normalizar telefone** para E.164 (ou dígitos únicos) *antes* de comparar.
2. **Âmbito:** hoje `Lead` **não tem `tenantId`** no schema raiz — os leads outbound são, na prática, **globais ao portal DevFlow**. Para produto multi-tenant comercial:
   - **Passo obrigatório:** adicionar `tenantId` (ou `whatsappTenantId`) em `Lead` e índice único composto.
3. **Chave de dedupe desejada (após `tenantId`):** `(tenantId, phone_e164)`.
4. **Multi-origem:** o mesmo telefone pode ter leads com `origin` diferentes; regra de produto:
   - **Opção A (simples):** um lead “canónico” por `(tenantId, phone)` — `origin` do primeiro contacto; merges posteriores só em notas.
   - **Opção B (comercial):** permitir duplicados com `origin` distinto mas **avisar na UI**; merge manual.

Recomendação DevFlow: **Opção A** para inbound automático + **exceção** se `convertedAt` preenchido (novo ciclo = novo lead).

### 3.2 O que ainda não existe (gargalo consciente)

- **Pipeline automático** `inbound → dedupe → create/update Lead → linkLeadToThread` **não** está ligado ao handler de mensagens (de propósito, para não duplicar leads sem política acordada).
- **`Lead.tenantId`:** ausente; **explode** em multi-tenant — tratar como **pré-requisito** antes de dedupe automático em produção multi-cliente.

---

## 4. Fluxo futuro (automação inbound)

Ordem sugerida:

1. Inbound persistido na thread (já existe).
2. Normalizar `phoneNumber` + resolver `tenantId` da thread.
3. `findFirst` lead por `(tenantId, phone)` quando `tenantId` existir no modelo; até lá, por `phone` + `conversationRef` vazio ou heurística frágil **só DevFlow interno**.
4. Se existir: `PATCH` mental = atualizar `lastContactAt` / notas opcionais; garantir `conversationRef` e `outboundLeadId` alinhados.
5. Se não existir: `createLeadFromConversation` (já grava `outboundLeadId` na thread).
6. Idempotência: lock por `threadId` ou debounce para evitar corridas em bursts de mensagens.

---

## 5. Referências

- Arquitetura geral: [CRM-ARCHITECTURE.md](./CRM-ARCHITECTURE.md)  
- Helpers de ligação: `src/lib/crm-sync.ts`  
- Origens canónicas: `src/lib/outbound-lead-origins.ts`
