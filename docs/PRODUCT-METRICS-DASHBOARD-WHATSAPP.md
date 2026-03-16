# Dashboard de métricas — WhatsApp Platform

Este documento descreve o dashboard interno de métricas do produto WhatsApp Platform, alinhado ao padrão do DevFlow (`docs/DEVFLOW-METRICS-DASHBOARD.md`).

---

## 1. Descrição

- **URL:** `/admin/metrics`
- **Fonte dos dados:** Contadores em memória via `@devflow/analytics-core` (`getCounters()`) e dados de ops (tenants, conversas, mensagens últimas 24h) do Supabase.
- **Proteção:** Em produção, endpoint e página exigem segredo de admin (`ADMIN_METRICS_SECRET`); em desenvolvimento o acesso é livre.

---

## 2. Métricas exibidas

### Seção 1 — Métricas do produto (analytics-core)

- **Tenant criado** — `whatsapp.tenant_created`
- **Conversa iniciada** — `whatsapp.conversation_started`
- **Conversa encerrada** — `whatsapp.conversation_closed`
- **Resposta IA gerada** — `whatsapp.ai_response_generated`
- **Mensagem enviada** — `whatsapp.message_sent`
- **Falha ao enviar** — `whatsapp.message_send_failed`
- **Mensagem recebida** — `whatsapp.inbound_message_received`
- **Webhook recebido** — `whatsapp.webhook_received`

### Seção 2 — Ops (Supabase)

- **Tenants** — total de contas/números
- **Conversas** — total de conversas
- **Mensagens (24h)** — mensagens nas últimas 24 horas

### Seção 3 — Funil (quando houver filas)

- Conversas em fila → atribuídas → em progresso → resolvidas (a ser expandido na Fase 2).

---

## 3. API interna

- **GET /api/admin/metrics**
  - **Resposta:** `{ whatsapp_platform: { metrics: Record<string, number> }, ops: { tenants, conversations, messagesLast24h } }`
  - **Proteção:** Em produção exige header `x-admin-metrics-secret` igual a `ADMIN_METRICS_SECRET`. Retorna 403 se não autorizado.

---

## 4. Componentes

Reutilização dos componentes do `@devflow/ui`: **MetricsCard**, **MetricsSection**, **FunnelVisualization**. Página com refresh a cada 15 segundos e botão "Atualizar".

---

## 5. Variáveis de ambiente

| Variável | Obrigatória (produção) | Descrição |
|----------|------------------------|-----------|
| `ADMIN_METRICS_SECRET` | Sim (para proteger /admin) | Segredo para header e proteção da página em produção. |
