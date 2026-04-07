# WhatsApp Platform — observabilidade mínima

Sem plataforma APM: logs estruturados no **stdout** (Vercel / runtime) com prefixos estáveis.

## Prefixos

| Prefixo | Uso |
|---------|-----|
| `[auth]` | Eventos de autenticação via `logAuth()` — JSON por linha, sem segredos |
| `[WHATSAPP][DEBUG]` | Webhook: payload resumido, passos de processamento |
| `[WHATSAPP][INFO]` | Webhook: eventos informativos (verify falho, payload não normalizado, só status) |
| `[WHATSAPP][ERROR]` | Webhook: falhas recuperáveis ou exceção global no POST |
| `[WHATSAPP][HINT]` | Dicas operacionais (ex.: `pgbouncer=true`) |

## Campos desejáveis em incidentes

Quando aplicável, os logs já carregam ou podem inferir:

- **Rota** — contexto do handler (ex.: auth route implícito pelo evento `login_success`)
- **tenant** — `tenantId` em logs de login, logout, webhook após resolução
- **status HTTP** — resposta devolvida ao cliente (inferida do teste ou do código)
- **tipo de erro** — mensagem sanitizada (sem stack em `logAuth`)

**trace_id:** não há trace distribuído obrigatório; em necessidade futura, propagar header `x-request-id` no middleware e incluir nos `console.*` relevantes.

## Onde revisar código

- `src/lib/auth-logger.ts`
- `src/modules/whatsapp/webhookHandler.ts`
- `src/app/api/auth/forgot-password/route.ts` — `[auth][forgot-password]` em falha de e-mail
- Billing: erros em rotas `billing/*` e `stripe/*` — preferir `console.error` com contexto de tenant quando disponível

## Ruído

- Evitar logar bodies completos de webhook em produção prolongada; o handler usa resumos (`bodySummary`, estrutura raw resumida).
