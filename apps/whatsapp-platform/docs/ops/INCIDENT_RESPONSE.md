# Playbook de incidentes — WhatsApp Platform

Documento operacional: qualquer pessoa com acesso ao deploy, logs e Stripe/Meta pode seguir estes passos.  
Ambiente típico: Vercel/host Node + Postgres + Redis (se existir) + Stripe + Meta Cloud API + OpenAI.

---

## 1. Antes de agir

1. **Confirmar impacto:** só um tenant, todos, ou só um canal (ex.: uma linha WhatsApp)?
2. **Janela:** começou após deploy, após mudança de env, ou aleatório?
3. **Correlação:** pedir ao utilizador ou ao log um **`trace_id`** (cabeçalho `X-Trace-Id` ou campo `trace_id` no JSON de erro) ou **`tenant_id`**.

**Onde ver logs:** consola do processo (JSON por linha). Procurar por:

- `"trace_id":"<uuid>"` — seguir todas as linhas com o mesmo valor (webhook → IA → outbound).
- `"tenant_id":"<id>"` — filtrar por tenant.
- `"event_type":"..."` — tipo de evento (ex.: `events_received`, `ai_auto_reply_pipeline_start`, `usage_limit_blocked`).

**Métricas em memória (processo):** `getMetricsSnapshot()` / health interno — contadores como `webhook_posts`, `errors`, `billing_enforcement_blocked` (úteis para tendência, não substituem APM).

---

## 2. Webhook a falhar ou a devolver erros

### Sintomas

- Meta mostra falhas de entrega no painel; clientes não recebem mensagens inbound na inbox.
- Respostas HTTP ≠ 200 em `POST /api/webhook/whatsapp`.

### Passos

1. Verificar **URL** e **verify token** no painel Meta vs env (`WHATSAPP_VERIFY_TOKEN`, URL canónica do deploy).
2. Se **429** nos logs ou resposta: rate limit por IP (`webhook-whatsapp`). Ajustar `WHATSAPP_WEBHOOK_RATE_MAX` / `WHATSAPP_WEBHOOK_RATE_WINDOW_MS` se tráfego legítimo da Meta for bloqueado (valores por defeito são altos).
3. Se **400 JSON**: payload inválido — log `invalid_json` com `trace_id`; verificar se algo está a chamar o endpoint sem corpo JSON.
4. Se **500** ou exceções: procurar `"source":"webhook"` e `"event":"exception"` no JSON; erros comuns:
   - **Postgres / pooler:** hint nos logs sobre `?pgbouncer=true` na URL.
   - **Tenant não resolvido:** `tenant_unresolved` — `phone_number_id` sem linha ACTIVE em `whatsapp_phone_numbers`.
5. **Reenvios duplicados** são esperados: logs `inbound_pipeline_skipped_duplicate` — não é erro se a primeira entrega processou.

### Mitigação rápida

- Corrigir env/URL/token; redeploy se env estiver errado no runtime.
- Se um tenant específico: validar linha WhatsApp e `access_token` não expirado.

---

## 3. Stripe a falhar (checkout, portal, webhooks)

### Sintomas

- Checkout ou portal não abre; utilizadores não conseguem subscrever.
- Webhooks Stripe com falhas no dashboard Stripe.

### Passos

1. **Webhook Stripe** (`POST /api/stripe/webhook`): confirmar `WHATSAPP_STRIPE_WEBHOOK_SECRET` e URL no Stripe Dashboard. Evento duplicado deve devolver 200 sem efeito duplicado (idempotência por `event.id`).
2. **Assinatura inválida:** 400 — secret errado ou body alterado por proxy.
3. **500 no handler:** ver logs com contexto `billing` / stack; verificar `tenantId` resolvido no evento.
4. **Checkout (POST /api/billing/checkout`):** rate limit `billing-checkout` se muitas tentativas do mesmo IP (429).

### Mitigação rápida

- Regenerar secret no Stripe e atualizar env; redeploy.
- Verificar customer/subscription no Stripe para o tenant afectado.

---

## 4. OpenAI / IA a falhar

### Sintomas

- Respostas automáticas em falta; logs com falhas de geração ou fallback.

### Passos

1. Confirmar **`OPENAI_API_KEY`** (ou provider configurado) no ambiente de produção.
2. Nos logs, procurar `ai_auto_reply_pipeline_start` com o mesmo `trace_id` que o webhook; depois `exception` em `phase: "ai_auto_reply"` ou eventos `fallback` / `error` no pipeline IA (tabelas/logs operacionais de IA).
3. **Limites de plano:** evento `usage_limit_blocked` com `tenant_id` — utilizador atingiu quota; esperado, não bug de infra.

### Mitigação rápida

- Rotação de chave OpenAI se revogada; verificar quotas OpenAI (rate limit da API).
- Pausar IA ao nível operacional (config tenant) se for preciso degradar com segurança.

---

## 5. Base de dados lenta ou erros de ligação

### Sintomas

- Timeouts; filas de mensagens a atrasar; erros Prisma nos logs.

### Passos

1. Verificar latência e conexões ao Postgres (dashboard do provider).
2. Pooler (Neon/Supabase): URL com parâmetros correctos (`pgbouncer`, `connection_limit`).
3. Índices: threads/mensagens com muito volume — observar queries lentas no provider.

### Mitigação rápida

- Escalar instância DB ou aumentar pool; reduzir carga (desligar jobs não essenciais temporariamente).

---

## 6. Isolamento por tenant (segurança)

- **APIs autenticadas:** `tenantId` vem do JWT/sessão — rotas não devem aceitar `tenantId` arbitrário no body para leitura de dados.
- Em caso de suspeita de **fuga de dados entre tenants:** rever PRs recentes em rotas `/api/inbox/*` e queries Prisma com `where: { tenantId }`.

---

## 7. Privacidade em logs

- Telefones e documentos são **mascarados** em campos típicos (`from`, `to`, chaves com `phone`, `cpf`, etc.).
- Não activar logs de payload bruto com PII em produção sem necessidade.

---

## 8. Contactos e escalação

- **Meta:** Business Support / status platform Meta.
- **Stripe:** Dashboard → status / suporte.
- **OpenAI:** Status page / billing da API.

Manter neste documento links internos (Slack, PagerDuty, runbook de deploy) se a equipa usar — secção opcional.

---

## 9. Checklist pós-incidente

- [ ] Causa raiz anotada (mesmo que seja “config”).
- [ ] Env/documentação actualizados se aplicável.
- [ ] Teste ou alerta adicionado para evitar repetição (opcional).
