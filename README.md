# DevFlow

**Hub central do ecossistema DevFlow** — plataforma que reúne automação de atendimento via WhatsApp com IA e ferramentas SaaS de gestão financeira, tudo sob um único domínio com SEO consolidado.

```
devflowlabs.com.br
├── /                          # Landing principal — Automação WhatsApp
├── /automacao-whatsapp-*      # Páginas de nicho (restaurante, tabacaria, etc.)
├── /demo                      # Demo interativa do robô WhatsApp
├── /produtos/
│   ├── /whatsapp-platform     # Produto automação WhatsApp
│   └── /funklab-studio        # Gerador musical IA (Funk, Mandelão, Phonk)
├── /ferramentas/              # Hub de ferramentas SaaS
│   ├── /financeiro            # App de controle financeiro pessoal/familiar
│   └── /divisao-de-contas     # Calculadora de divisão de contas
├── /pricing                   # Planos e preços
├── /upgrade                   # Upgrade de plano (checkout Stripe)
├── /blog                      # Conteúdo e SEO
└── /admin/metrics             # Dashboard interno de métricas
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Linguagem | TypeScript (strict) |
| ORM | Prisma 6 + PostgreSQL (Supabase) |
| Auth | Supabase Auth (SSR) |
| Pagamentos | Stripe (Checkout + Webhooks) |
| WhatsApp | Meta Cloud API (webhook + robô) |
| Testes | Vitest |
| Deploy | Vercel |

---

## Início rápido

```bash
pnpm install
cp .env.example .env.local   # editar com suas credenciais
pnpm db:migrate
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm test` | Rodar testes (Vitest) |
| `pnpm test:watch` | Testes em modo watch |
| `pnpm db:migrate` | Criar e aplicar migrations |
| `pnpm db:generate` | Gerar Prisma Client |
| `pnpm deploy:preview` | Deploy preview (Vercel) |
| `pnpm deploy:prod` | Deploy produção (Vercel) |

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local`:

### Supabase / Banco
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
DATABASE_URL=          # pooler porta 6543 (runtime)
DIRECT_URL=            # conexão direta porta 5432 (migrations)
```

### Stripe (Pagamentos)
```env
STRIPE_SECRET_KEY=         # sk_live_... (produção)
STRIPE_TEST_SECRET_KEY=    # sk_test_... (dev — usa automaticamente)
STRIPE_WEBHOOK_SECRET=     # whsec_... do endpoint cadastrado
STRIPE_PRICE_PRO=          # price_... live plano PRO
STRIPE_PRICE_TEAM=         # price_... live plano TEAM
STRIPE_TEST_PRICE_PRO=     # price_... teste plano PRO
STRIPE_TEST_PRICE_TEAM=    # price_... teste plano TEAM
```

### WhatsApp Cloud API
```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_DEMO_MODE=false
```

### Outros
```env
NEXT_PUBLIC_WHATSAPP_NUMBER=      # Número público (botões wa.me)
NEXT_PUBLIC_META_PIXEL_ID=        # Meta Pixel
ADMIN_METRICS_SECRET=             # Proteção da rota /api/admin/metrics (produção)
```

---

## Produto 1 — Automação WhatsApp

Robô de atendimento via WhatsApp Cloud API com:

- Fluxo conversacional configurável
- Handoff humano
- Demo interativa em `/demo`
- Páginas de nicho para SEO (`/automacao-whatsapp-restaurante`, `-tabacaria`, etc.)
- Meta Pixel integrado (PageView, ViewContent, Contact)

Setup: [`docs/WHATSAPP-SETUP.md`](docs/WHATSAPP-SETUP.md)

---

## Produto 2 — Investiga+

Plataforma SaaS de inteligência de CNPJ e business intelligence (repositório próprio):

- **Busca de CNPJ** — integração ReceitaWS com cache local
- **Histórico de consultas** — filtros avançados por usuário
- **Perfil + bônus** — gerenciamento de créditos/bônus
- **Webhook** — integração para automações externas
- **Arquitetura limpa** — Node.js + Express + Prisma + PostgreSQL

Repositório: [TraffikPro/investiga-mais](https://github.com/TraffikPro/investiga-mais) · Live: [investigamais.com](https://investigamais.com)

---

## Produto 3 — FunkLab Studio

Gerador musical assistido por IA para produtores de funk, mandelão e phonk:

- **Sketch Generator** — múltiplas ideias de groove automaticamente por estilo e BPM
- **Bassline Generator** — linhas de baixo MIDI configuráveis (root, escala, duração, BPM)
- **Biblioteca integrada** — presets, grooves e bass patterns (Mandelão, Funk, Phonk, Tech House)
- **Exportação direta** — MIDI, áudio e projetos para DAW
- **Engine musical** — humanização de timing/velocity, slides, ghost notes

Rota: `/produtos/funklab-studio`

---

## Produto 4 — Ferramentas Financeiras

App SaaS completo de gestão financeira pessoal e familiar:

- **Dashboard** — resumo mensal + projeção de fluxo de caixa
- **Despesas / Rendas / Fontes** — controle completo
- **Regras de rateio** — divisão automática por percentual ou valor fixo
- **Casas (Households)** — multi-casa com convites por e-mail
- **Ciclos** — periodos de controle por mês/ano
- **Simulador público** — ferramenta de atração no `/ferramentas/financeiro`

### Arquitetura do módulo financeiro

```
src/modules/financeiro/
├── services/          # Regras de negócio puras (sem Next.js)
├── adapters/          # Prisma, auth, cookies, logger, metrics, analytics
├── events/            # Domain events (event bus + handlers)
├── components/        # Componentes do módulo
├── schemas/           # Validação Zod
└── types/             # Tipos do domínio
```

Documentação: [`docs/FINANCEIRO-MODULE-ARCHITECTURE.md`](docs/FINANCEIRO-MODULE-ARCHITECTURE.md)

---

## Billing / Planos

| Plano | Casas | Regras | Features |
|-------|-------|--------|----------|
| FREE | 1 | 3 | — |
| PRO | 5 | 50 | Regras avançadas, Exports, Analytics |
| TEAM | 20 | 500 | Todas |

Integração Stripe com arquitetura substituível (Lemon, Paddle, Mercado Pago):

```bash
# Testar pagamento localmente
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Documentação: [`docs/DEVFLOW-PAYMENTS.md`](docs/DEVFLOW-PAYMENTS.md)

---

## Growth Analytics

Pipeline de métricas do funil de aquisição completo (em memória, preparado para ferramenta externa):

```
visitor_landed → simulator_used → lead_submitted → signup → household_created → first_expense
```

Dashboard interno: `http://localhost:3000/admin/metrics`

Documentação: [`docs/DEVFLOW-GROWTH-ANALYTICS.md`](docs/DEVFLOW-GROWTH-ANALYTICS.md)

---

## Testes

```bash
pnpm test
```

Cobertura atual: **104 testes** em services, adapters, events, analytics, billing e rotas de API.

---

## Deploy

Recomendado: **Vercel**

```bash
pnpm deploy:preview   # preview (branch / PR)
pnpm deploy:prod      # produção
```

Após deploy, registre o webhook Stripe no Dashboard:
```
https://seu-dominio.vercel.app/api/billing/webhook
```

Documentação: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [`ARQUITETURA-FERRAMENTAS-DEVFLOW.md`](docs/ARQUITETURA-FERRAMENTAS-DEVFLOW.md) | DevFlow como hub de ferramentas |
| [`FINANCEIRO-MODULE-ARCHITECTURE.md`](docs/FINANCEIRO-MODULE-ARCHITECTURE.md) | Arquitetura do módulo financeiro |
| [`FINANCEIRO-API-MAP.md`](docs/FINANCEIRO-API-MAP.md) | Mapa de todas as APIs |
| [`FINANCEIRO-DATA-MODEL.md`](docs/FINANCEIRO-DATA-MODEL.md) | Modelo de dados |
| [`FINANCEIRO-DOMAIN-EVENTS.md`](docs/FINANCEIRO-DOMAIN-EVENTS.md) | Sistema de domain events |
| [`FINANCEIRO-FEATURE-STANDARD.md`](docs/FINANCEIRO-FEATURE-STANDARD.md) | Padrão para novas features |
| [`FINANCEIRO-APP-VS-GROWTH.md`](docs/FINANCEIRO-APP-VS-GROWTH.md) | Separação app vs. growth |
| [`FINANCEIRO-PRODUCT-ANALYTICS.md`](docs/FINANCEIRO-PRODUCT-ANALYTICS.md) | Product analytics |
| [`FINANCEIRO-PRODUCT-SPEC.md`](docs/FINANCEIRO-PRODUCT-SPEC.md) | Especificação do produto |
| [`DEVFLOW-GROWTH-ANALYTICS.md`](docs/DEVFLOW-GROWTH-ANALYTICS.md) | Growth analytics end-to-end |
| [`DEVFLOW-METRICS-DASHBOARD.md`](docs/DEVFLOW-METRICS-DASHBOARD.md) | Dashboard interno de métricas |
| [`DEVFLOW-MONETIZATION.md`](docs/DEVFLOW-MONETIZATION.md) | Camada de monetização |
| [`DEVFLOW-PAYMENTS.md`](docs/DEVFLOW-PAYMENTS.md) | Integração Stripe |
| [`PRISMA-SUPABASE-SETUP.md`](docs/PRISMA-SUPABASE-SETUP.md) | Setup Prisma + Supabase |
| [`RELATORIO-PADROES-DESIGN-PARA-FINANCEIRO.md`](docs/RELATORIO-PADROES-DESIGN-PARA-FINANCEIRO.md) | Padrões de design |
| [`WHATSAPP-SETUP.md`](docs/WHATSAPP-SETUP.md) | Setup WhatsApp Cloud API |
| [`META_ADS.md`](docs/META_ADS.md) | Configuração Meta Pixel / Meta Ads |
| [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploy Vercel |

---

## Licença

Projeto privado — DevFlow.
