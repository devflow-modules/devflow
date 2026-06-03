# Demo / Showcase Mode — WhatsApp Platform

Modo **vitrine** para portfólio e recrutadores: navega pelas telas principais com **dados fictícios**, sem depender de PostgreSQL, Meta, Stripe ou sessão real.

> **Distinto de** `WHATSAPP_DEMO_MODE` (servidor): resposta automática à palavra «demo» no motor rule-based de IA — não activa esta vitrine.

---

## Objetivo

- Gerar **screenshots** e **vídeo curto** (60–90 s) do produto.
- Mostrar inbox multi-tenant, filas, agentes, métricas e billing **sem expor tokens ou PII real**.

---

## Como activar

1. No pacote `apps/whatsapp-platform`, criar ou editar `.env.local` (não commitar):

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_PRODUCT_MODE=SAAS
```

2. Reiniciar o dev server:

```bash
cd apps/whatsapp-platform
pnpm dev
```

3. Abrir `http://localhost:3000` (ou `NEXT_PUBLIC_WHATSAPP_APP_URL` se definida).

**Não é necessário** `JWT_SECRET`, `WHATSAPP_DATABASE_URL`, chaves Stripe ou Meta para este modo.

Opcional em produção de preview (não recomendado para clientes reais):

- Usar project Vercel dedicado só à vitrine.
- Nunca combinar com credenciais reais no mesmo deploy.

---

## Variáveis

| Variável | Obrigatória no demo | Descrição |
|----------|---------------------|-----------|
| `NEXT_PUBLIC_DEMO_MODE` | Sim (`true`) | Liga mocks de API, auth fictícia e bypass de middleware. |
| `NEXT_PUBLIC_PRODUCT_MODE` | Recomendado `SAAS` | Mostra billing/planos na UI; use `WHITE_LABEL` para gravar modo white-label. |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | Opcional | URL base nos links absolutos. |

---

## O que acontece por baixo

- **Middleware**: responde a pedidos `/api/*` conhecidos com JSON mock; páginas protegidas abrem sem cookie JWT.
- **Auth**: `getAuthFromRequest` / `validateAuthToken` devolvem utilizador **manager** demo.
- **RSC**: `getTenantSnapshot` indica tenant activado com linha WhatsApp fictícia.
- **Serviços**: listagens de agentes e filas em servidor usam fixtures em `src/demo/fixtures.ts`.
- **UI**: faixa âmbar «Modo vitrine (demo)» no topo do shell.

Nenhum contrato público de API existente foi alterado — apenas respostas simuladas quando o modo está ligado.

---

## Fluxo recomendado para recrutador (5–7 min)

1. **Dashboard** — `/dashboard` — cartões de volume, funil e receita demo.
2. **Onboarding** — `/onboarding` — wizard de activação (UI; sem Cloud API real).
3. **Agentes** — `/agents` — equipa, estados e filas atribuídas.
4. **Filas** — `/queues` — backlog, SLA e membros.
5. **Inbox** — `/inbox` — lista de conversas; abrir **Mariana Silva** (thread principal).
6. **Definições** — `/settings` — tenant e IA.
7. **Billing** — `/dashboard/billing` ou `/settings/billing` (com `SAAS`).
8. **White-label** (opcional) — rebuild com `NEXT_PUBLIC_PRODUCT_MODE=WHITE_LABEL` e repetir dashboard/settings.

---

## Roteiro para screenshots

Capturar em **1440×900** ou **1280×800**, tema claro, faixa demo visível.

| # | Rota | Ficheiro sugerido |
|---|------|-------------------|
| 1 | `/dashboard` | `01-dashboard-metrics.png` |
| 2 | `/onboarding` | `02-onboarding-wizard.png` |
| 3 | `/agents` | `03-agents-team.png` |
| 4 | `/queues` | `04-queues-assignment.png` |
| 5 | `/inbox` + thread aberta | `05-inbox-conversation.png` |
| 6 | `/settings` | `06-settings.png` |
| 7 | `/dashboard/billing` | `07-billing-plan.png` |
| 8 | WL: `/dashboard` | `08-white-label-dashboard.png` |

Guardar em `docs/assets/` (ver checklist em `docs/assets/README.md`).

---

## Roteiro para vídeo (60–90 s)

| Tempo | Cena | Narração sugerida |
|-------|------|-------------------|
| 0–10 s | Dashboard | «Painel com volume, tempo de resposta e funil comercial.» |
| 10–20 s | Filas + Agentes | «Filas operacionais e equipa com estados em tempo real.» |
| 20–45 s | Inbox (enviar mensagem demo) | «Inbox multi-tenant: fila, tags, notas e sugestão de resposta.» |
| 45–60 s | Settings / IA | «Configuração do assistente por tenant.» |
| 60–75 s | Billing (SAAS) | «Planos e uso — integração Stripe no produto real.» |
| 75–90 s | Encerrar no dashboard | «WhatsApp Platform DevFlow — Cloud API oficial, SaaS e white-label.» |

Ferramentas: OBS, QuickTime ou Loom; export 1080p, sem áudio sensível.

---

## Limitações

- Dados **estáticos** — alterações em PATCH/POST não persistem após refresh.
- Rotas `/api/admin/*` de plataforma, webhooks Meta/Stripe e Embedded Signup **não** são simulados.
- Realtime (`/api/realtime/stream`) devolve 204 — sem eventos live.
- Testes E2E com credenciais reais continuam a exigir env separado (`E2E_*`).
- **Não usar** este modo em deploy com base de dados de clientes reais.

---

## Aviso de segurança

Este modo **não utiliza** tokens Meta, chaves Stripe, API keys de tenant nem dados de produção. Fixtures usam e-mails `@showcase.devflow.local` e IDs prefixados `demo-`.

---

## Referências no código

- `src/lib/demoMode.ts`
- `src/demo/fixtures.ts`
- `src/demo/resolveDemoApiResponse.ts`
- `src/components/demo/ShowcaseDemoBanner.tsx`
