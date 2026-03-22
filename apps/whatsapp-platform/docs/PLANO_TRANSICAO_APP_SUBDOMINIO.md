# Plano de transição para app.devflowlabs.com.br

Transição do webhook e SaaS do domínio principal para o subdomínio **sem quebrar nada** (zero downtime).

---

## Estado atual

| Domínio | App | Webhook | Lógica |
|---------|-----|---------|--------|
| `devflowlabs.com.br` | App raiz (`src/`) | ✅ `/api/webhook/whatsapp` | `whatsapp-webhook` legado |
| `app.devflowlabs.com.br` | — | ❌ 404 | — |

**whatsapp-platform** (multi-tenant, Embedded Signup, tenant resolution via `WhatsappPhoneNumber`) roda em dev local (porta 3004) e ainda não está publicado.

---

## Arquitetura alvo

| Domínio | App | Webhook | Lógica |
|---------|-----|---------|--------|
| `devflowlabs.com.br` | App raiz (site institucional) | opcional/legado | — |
| `app.devflowlabs.com.br` | whatsapp-platform | ✅ `/api/webhook/whatsapp` | tenant resolution, Prisma, IA, billing |

---

## Fases da transição

### Fase 0 — Pré-requisitos (antes de começar)

- [ ] `WHATSAPP_DATABASE_URL` de produção configurada e acessível
- [ ] Migrations aplicadas no banco de produção (`pnpm db:migrate`)
- [ ] Variáveis do whatsapp-platform documentadas (veja `DEPLOY_APP_SUBDOMAIN.md`)

---

### Fase 1 — Deploy em paralelo (sem impacto)

Objetivo: ter `app.devflowlabs.com.br` no ar **sem alterar** o que a Meta usa hoje.

1. **Novo projeto no Vercel**
   - Add New → Project → mesmo repositório
   - Nome: `whatsapp-platform` ou `app-devflowlabs`

2. **Configuração**
   - Root Directory: `apps/whatsapp-platform`
   - Variáveis de ambiente: conforme `DEPLOY_APP_SUBDOMAIN.md`
   - `NEXT_PUBLIC_WHATSAPP_APP_URL` = `https://app.devflowlabs.com.br`

3. **DNS**
   - Registrar `app.devflowlabs.com.br` no Vercel (Settings → Domains)
   - No provedor de DNS: CNAME `app` → `cname.vercel-dns.com`
   - Aguardar propagação (5–30 min)

4. **Deploy e validação**
   ```bash
   # Após o deploy, testar verificação do webhook:
   curl "https://app.devflowlabs.com.br/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_VERIFY_TOKEN&hub.challenge=999"
   # Deve retornar: 999
   ```

5. **OAuth na Meta**
   - Meta for Developers → seu app → WhatsApp → Configuration
   - Em **Valid OAuth Redirect URIs**, incluir:
     `https://app.devflowlabs.com.br/dashboard/whatsapp/callback`
   - (não alterar ainda o Callback URL do webhook)

**Resultado:** `devflowlabs.com.br` continua recebendo o webhook. `app.devflowlabs.com.br` está pronto para receber.

---

### Fase 2 — Troca do webhook na Meta

Momento da transição: em poucos segundos.

1. **Meta Dashboard**
   - WhatsApp → Configuration → Webhook

2. **Alterar Callback URL**
   - De: `https://devflowlabs.com.br/api/webhook/whatsapp`
   - Para: `https://app.devflowlabs.com.br/api/webhook/whatsapp`

3. **Verify Token**
   - Manter o mesmo (ex: `devflow_8f3a2e9c1b7d4f6a0e5c8b2`)

4. **Salvar**
   - A Meta faz um GET de verificação
   - Se `app.devflowlabs.com.br` responder com o challenge, o status fica verde

**Resultado:** Novo fluxo em produção. Downtime efetivo: 0 (a Meta só troca de URL após validar).

---

### Fase 3 — Validação pós-transição

1. **Webhook de teste**
   - No Meta: “Enviar webhook de teste” (se disponível)
   - Conferir logs no Vercel do projeto whatsapp-platform: `[WHATSAPP] inbound tenant=...`

2. **Onboarding**
   - Acessar dashboard (via `app.devflowlabs.com.br` ou link interno)
   - Conectar novo número (Embedded Signup)
   - Verificar se o fluxo OAuth completa e salva em `WhatsappPhoneNumber`

3. **Mensagem de teste**
   - Enviar mensagem para o número conectado
   - Confirmar que entra na fila, IA responde (se configurada), etc.

---

### Fase 4 — Rollback (se necessário)

Se algo der errado:

1. **Meta Dashboard**
   - Callback URL: voltar para `https://devflowlabs.com.br/api/webhook/whatsapp`
   - Salvar

2. O webhook volta a ser atendido pelo app raiz imediatamente.

---

## Checklist rápido

| # | Ação | Status |
|---|------|--------|
| 0.1 | Banco de produção + migrations | ☐ |
| 1.1 | Projeto Vercel whatsapp-platform | ☐ |
| 1.2 | Root Directory + env vars | ☐ |
| 1.3 | Domínio app.devflowlabs.com.br + DNS | ☐ |
| 1.4 | Deploy + curl de teste | ☐ |
| 1.5 | OAuth Redirect URI na Meta | ☐ |
| 2.1 | Alterar Callback URL na Meta | ☐ |
| 3.1 | Teste webhook + onboarding + mensagem | ☐ |

---

## Diferença de comportamento

| Aspecto | App raiz (legado) | whatsapp-platform |
|---------|-------------------|-------------------|
| Tenant resolution | Lógica antiga | `WhatsappPhoneNumber`, `tenantResolutionService` |
| Prisma | Banco principal | `WHATSAPP_DATABASE_URL` dedicado |
| Embedded Signup | Não | Sim |
| Dashboard /dashboard/whatsapp | Não | Sim |

A troca significa passar a usar a pilha multi-tenant unificada em produção.

---

## Referências

- `DEPLOY_APP_SUBDOMAIN.md` — Deploy do whatsapp-platform no subdomínio
- `WEBHOOK_MIGRACAO_META.md` — Checklist de migração do webhook na Meta
