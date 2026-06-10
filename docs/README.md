# Documentação DevFlow

Índice do monorepo. Cada pasta agrupa docs por **produto**, **CRM / operações comerciais** ou **tema transversal**.

---

## Foco público atual (lançamento)

O hub **`devflowlabs.com.br`** posiciona-se hoje em torno de:

1. **WhatsApp Platform** — automação de atendimento no WhatsApp, demo e páginas de produto.  
2. **Financeiro** — app de controle financeiro em `/ferramentas/financeiro`.

**CRM interno** (equipa comercial DevFlow): `/admin/leads` e `/admin/lead-finder` — ver pasta [**crm/**](./crm/). Playbook comercial (ICP, outbound, funil, demo): [**GO-TO-MARKET.md**](./GO-TO-MARKET.md).

Outros apps no repositório (**ApplyFlow** como case de portfólio local-first, Investigamais, FunkLab, etc.) mantêm documentação técnica própria; apenas WhatsApp + Financeiro são pilares do go-to-market público actual do hub neste índice.

**DevFlow Career Suite** — ligação **local-first** entre ApplyFlow (candidaturas) e Interview Lab (treino de entrevista) via JSON **`CareerBundle`** (`@devflow/career-core`). Índice técnico: [**career-suite/README.md**](./career-suite/README.md) · **case público (portfólio):** [**public-cases/CAREER-SUITE.md**](./public-cases/CAREER-SUITE.md).

---

## Mapa de pastas

| Pasta | Conteúdo |
|-------|----------|
| [**crm/**](./crm/) | CRM portal: leads, Lead Finder, follow-up, templates |
| [**whatsapp/**](./whatsapp/) | Cloud API, webhooks, onboarding, visão de produto |
| [**whatsapp-platform/**](./whatsapp-platform/) | Inbox multi-tenant (`apps/whatsapp-platform`) |
| [**financeiro/**](./financeiro/) | App controle financeiro (`apps/financeiro` + módulo site) |
| [**applyflow/**](./applyflow/) | ApplyFlow: dashboard local-first, extensão Chrome, arquitectura, publicação e screenshots |
| [**career-suite/**](./career-suite/) | DevFlow Career Suite: ponte ApplyFlow ↔ Interview Lab (CareerBundle, privacidade, demo) |
| [**public-cases/**](./public-cases/) | Cases públicos de portfólio (narrativa para recrutadores / LinkedIn) |
| [**investigamais/**](./investigamais/) | Investiga+ (referência técnica; produto separado) |
| [**shared/**](./shared/) | Monorepo, deploy, Prisma, monetização, ADRs |
| [**ecossistema/**](./ecossistema/) | Rotas, URLs e visão do hub |
| [**site/**](./site/) | Inventário de rotas e decisões de routing |
| [**seo/**](./seo/) | Pilares, clusters, indexação |
| [**backlinks/**](./backlinks/) | Rascunhos de artigos / link building |
| [**ai-ops/**](./ai-ops/) | Workflow de IA, checklists de demo |
| [**architecture/**](./architecture/) | Cutover, guardrails, políticas |
| [**brand/**](./brand/) | Marca, sistema visual e guidelines do portal |
| [**products/**](./products/) | Governança, inventário e critérios de priorização dos produtos DevFlow |
| [**healthsafe-rpa/**](./healthsafe-rpa/) | Referência HealthSafe × RPA |
| [**_archive/**](./_archive/) | Migrações e relatórios históricos |

---

## Por tema

### Produto WhatsApp (público + técnico)

| Preciso de… | Documento |
|-------------|-----------|
| **Auditoria de maturidade (piloto / GTM)** | [whatsapp-platform/WHATSAPP-PLATFORM-AUDIT.md](./whatsapp-platform/WHATSAPP-PLATFORM-AUDIT.md) |
| **Visão de produto (lançamento)** | [whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md](./whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md) |
| Setup Cloud API | [whatsapp/WHATSAPP-SETUP.md](./whatsapp/WHATSAPP-SETUP.md) |
| Ativação real (runbook) | [whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](./whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md) |
| Inbox SaaS | [whatsapp-platform/README.md](./whatsapp-platform/README.md) |

### CRM / vendas (portal, interno)

| Preciso de… | Documento |
|-------------|-----------|
| **Playbook GTM (manual de crescimento)** | [GO-TO-MARKET.md](./GO-TO-MARKET.md) |
| Índice CRM | [crm/README.md](./crm/README.md) |
| `/admin/leads` | [crm/LEADS-CRM.md](./crm/LEADS-CRM.md) |
| `/admin/lead-finder` | [crm/LEAD-FINDER.md](./crm/LEAD-FINDER.md) |
| Follow-up e ações | [crm/FOLLOW-UP-ENGINE.md](./crm/FOLLOW-UP-ENGINE.md) |
| Templates WhatsApp | [crm/MESSAGE-TEMPLATES.md](./crm/MESSAGE-TEMPLATES.md) |

### Financeiro

| Preciso de… | Documento |
|-------------|-----------|
| README técnico | [financeiro/README.md](./financeiro/README.md) |
| README app | [apps/financeiro/README.md](../apps/financeiro/README.md) |
| Go-live | [financeiro/GO_LIVE_FINANCEIRO.md](./financeiro/GO_LIVE_FINANCEIRO.md) |
| Supabase Auth | [financeiro/SUPABASE_URLS.md](./financeiro/SUPABASE_URLS.md) |
| Changelog | [financeiro/CHANGELOG.md](./financeiro/CHANGELOG.md) |

### Infra, deploy e monorepo

| Preciso de… | Documento |
|-------------|-----------|
| Rotas no ar | [ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md](./ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md) |
| Boundaries monorepo | [shared/ARCHITECTURE_BOUNDARIES.md](./shared/ARCHITECTURE_BOUNDARIES.md) |
| Prisma + Supabase | [shared/PRISMA-SUPABASE-SETUP.md](./shared/PRISMA-SUPABASE-SETUP.md) |
| Deploy Vercel | [shared/DEPLOYMENT.md](./shared/DEPLOYMENT.md) |
| Build Vercel | [VERCEL_BUILD.md](./VERCEL_BUILD.md) |
| Variáveis de ambiente | [ENV_STRUCTURE.md](./ENV_STRUCTURE.md) |
| Stripe / billing | [shared/DEVFLOW-PAYMENTS.md](./shared/DEVFLOW-PAYMENTS.md) |
| Métricas dashboard | [shared/DEVFLOW-METRICS-DASHBOARD.md](./shared/DEVFLOW-METRICS-DASHBOARD.md) |

### Produtos e governança

| Preciso de… | Documento |
|-------------|-----------|
| **Regras de classificação e prioridade** | [products/PRODUCT-GOVERNANCE.md](./products/PRODUCT-GOVERNANCE.md) |
| **Inventário de iniciativas** | [products/PRODUCT-INVENTORY.md](./products/PRODUCT-INVENTORY.md) |

### Marca e sistema visual

- [DevFlow Brand Guidelines](brand/DEVFLOW_BRAND_GUIDELINES.md) — logo, naming, tom visual e diretrizes institucionais.
- [DevFlow Brand System](brand/DEVFLOW-BRAND-SYSTEM.md) — paleta, tokens, utilities, semântica operacional, CTAs e regras de interface para o site/marketing.
- [DevFlow Product UI System](brand/DEVFLOW-PRODUCT-UI-SYSTEM.md) — espaçamento, densidade, estados operacionais, acessibilidade e padrões de inbox/dashboard/admin (`apps/whatsapp-platform`).

---

## READMEs por área

- [crm/README.md](./crm/README.md)  
- [financeiro/README.md](./financeiro/README.md)  
- [whatsapp/README.md](./whatsapp/README.md)  
- [applyflow/](./applyflow/) (índice em `docs/applyflow/` — ver também [ARCHITECTURE.md](./applyflow/ARCHITECTURE.md))  
- [career-suite/README.md](./career-suite/README.md) (ApplyFlow + Interview Lab, CareerBundle)  
- [DevFlow Career Suite — public case](./public-cases/CAREER-SUITE.md) (portfólio / LinkedIn / demo script)  
- [apps/applyflow/README.md](../apps/applyflow/README.md) (dashboard Next.js)  
- [apps/applyflow-extension/README.md](../apps/applyflow-extension/README.md) (extensão Chrome MV3)  
- [investigamais/README.md](./investigamais/README.md) (produto / app separado)  
- [shared/README.md](./shared/README.md)  
- [backlinks/README.md](./backlinks/README.md)  
