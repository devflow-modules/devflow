# Showcase — guia de revisão para recrutadores

Documento complementar ao [DEMO-WALKTHROUGH.md](./DEMO-WALKTHROUGH.md). Foco: **o que olhar**, **ordem de navegação** e **o que cada ecrã prova tecnicamente** — sem credenciais reais.

---

## Resumo do que revisar

O WhatsApp Platform é um SaaS/white-label de **operação WhatsApp multi-tenant**: inbox, filas, agentes, métricas, billing e onboarding Cloud API. No **demo mode**, tudo isto é navegável com fixtures seguras (`demo-*`, e-mails `@showcase.devflow.local`).

| Área | O que validar |
|------|----------------|
| Arquitetura | Next.js App Router, módulos de domínio, APIs REST, middleware |
| Multi-tenant | Isolamento por tenant (fixtures simulam um tenant demo) |
| Operação | Inbox, filas, assign, SLA, sugestão de resposta |
| Produto | Modo SAAS vs white-label, billing visível/oculto |
| Qualidade | TypeScript estrito, Vitest, documentação operacional |

---

## Demo mode vs produção

| | **Demo (`NEXT_PUBLIC_DEMO_MODE=true`)** | **Produção** |
|---|----------------------------------------|--------------|
| Base de dados | Não necessária; fixtures + middleware mock | PostgreSQL (Prisma) + Supabase |
| Auth | Sessão manager fictícia; páginas protegidas abrem sem login | JWT + sessão em DB |
| Meta / WhatsApp | Sem webhook nem Cloud API real | Webhook assinado, Embedded Signup |
| Stripe | UI/billing mock | Checkout, portal, webhooks metered |
| Persistência | POST/PATCH não persistem após refresh | Estado real por tenant |
| Segredos | Nenhum token exposto | Env completa (ver `.env.example`) |

**Distinto de** `WHATSAPP_DEMO_MODE` (servidor): resposta IA à palavra «demo» no webhook — não activa esta vitrine.

---

## Comandos para rodar local

```bash
cd apps/whatsapp-platform
pnpm install
```

Criar `.env.local`:

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_PRODUCT_MODE=SAAS
```

```bash
pnpm dev
```

Abrir `http://localhost:3000`. Rotas principais abrem **sem** `JWT_SECRET`, DB ou chaves externas.

Testes rápidos do modo demo:

```bash
pnpm test src/demo
pnpm lint
NEXT_PUBLIC_DEMO_MODE=true SKIP_ENV_VALIDATION=1 pnpm build
```

---

## Ordem ideal para recrutador (5–8 min)

1. **`/dashboard`** — visão gerencial e métricas agregadas  
2. **`/queues`** + **`/agents`** — operação de equipa e distribuição  
3. **`/inbox`** — thread **Mariana Silva**; mensagens, tags, painel lateral  
4. **`/settings`** — configuração tenant / IA  
5. **`/dashboard/billing`** — plano e uso (SAAS)  
6. **`/onboarding`** — wizard de activação (UI only no demo)  
7. *(Opcional)* rebuild com `WHITE_LABEL` e repetir dashboard/settings  

Faixa âmbar no topo: «Modo vitrine (demo)» — deixa explícito que são dados fictícios.

---

## Páginas principais e o que cada uma prova

| Rota | Prova técnica |
|------|----------------|
| `/dashboard` | RSC + client fetch; agregação métricas (`/api/metrics/*`); dashboard gerencial |
| `/onboarding` | Wizard multi-step; fluxo pós-signup; integração futura Cloud API |
| `/agents` | RSC + serviço de agentes operacionais; estados `available` / `busy` / `offline` |
| `/queues` | Filas `WaInboxQueue`; backlog, SLA, membros — modelo operacional |
| `/inbox` | UI full-bleed; React Query; conversas, mensagens, assign, CRM leve na thread |
| `/settings` | PATCH tenant; config IA; developer / API key (sanitizado no demo) |
| `/dashboard/billing` | `@devflow/billing-core`; planos, usage, feature gates (SAAS) |
| WL: `/dashboard` | `NEXT_PUBLIC_PRODUCT_MODE`; sanitização billing na UI e APIs |

Código de referência: `src/demo/fixtures.ts`, `src/demo/resolveDemoApiResponse.ts`, `src/lib/demoMode.ts`.

---

## Roteiro de vídeo (60–90 s)

| Tempo | Cena | Fala sugerida |
|-------|------|----------------|
| 0–10 s | Dashboard | «Painel com volume, tempo de resposta e funil comercial.» |
| 10–22 s | Filas + Agentes | «Filas operacionais e equipa com estados em tempo real.» |
| 22–45 s | Inbox (enviar/responder demo) | «Inbox multi-tenant: fila, tags, histórico e sugestão de resposta.» |
| 45–55 s | Settings | «Configuração do assistente e tenant.» |
| 55–70 s | Billing | «Planos e metering — Stripe no deploy real.» |
| 70–85 s | Dashboard (encerrar) | «WhatsApp Platform DevFlow — Cloud API, SaaS e white-label.» |

Export: 1080p, sem áudio sensível. Ferramentas: OBS, Loom ou QuickTime.

---

## Screenshots para o README

Capturar PNG conforme [assets/README.md](./assets/README.md). Quando existirem, descomentar a secção `## Screenshots` no [README.md](../README.md) do app.

---

## Documentação relacionada

- [DEMO-WALKTHROUGH.md](./DEMO-WALKTHROUGH.md) — activação, variáveis, limitações  
- [ARCHITECTURE.md](./ARCHITECTURE.md) — camadas do app  
- [PRODUCT_MODE.md](./PRODUCT_MODE.md) — SAAS vs white-label  
