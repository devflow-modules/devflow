# Documentação DevFlow

Índice do monorepo. Cada pasta agrupa docs por **produto**, **CRM / operações comerciais** ou **tema transversal**.

---

## Foco público atual (lançamento)

O hub **`devflowlabs.com.br`** posiciona-se hoje em torno de:

1. **WhatsApp Platform** — automação de atendimento no WhatsApp, demo e páginas de produto.  
2. **Financeiro** — app de controle financeiro em `/ferramentas/financeiro`.

**CRM interno** (equipa comercial DevFlow): `/admin/leads` e `/admin/lead-finder` — ver pasta [**crm/**](./crm/).

Outros apps no repositório (Investigamais, FunkLab, etc.) mantêm documentação técnica própria, mas **não** são tratados como pilares do go-to-market público atual neste índice.

---

## Mapa de pastas

| Pasta | Conteúdo |
|-------|----------|
| [**crm/**](./crm/) | CRM portal: leads, Lead Finder, follow-up, templates |
| [**whatsapp/**](./whatsapp/) | Cloud API, webhooks, onboarding, visão de produto |
| [**whatsapp-platform/**](./whatsapp-platform/) | Inbox multi-tenant (`apps/whatsapp-platform`) |
| [**financeiro/**](./financeiro/) | App controle financeiro (`apps/financeiro` + módulo site) |
| [**investigamais/**](./investigamais/) | Investiga+ (referência técnica; produto separado) |
| [**shared/**](./shared/) | Monorepo, deploy, Prisma, monetização, ADRs |
| [**ecossistema/**](./ecossistema/) | Rotas, URLs e visão do hub |
| [**site/**](./site/) | Inventário de rotas e decisões de routing |
| [**seo/**](./seo/) | Pilares, clusters, indexação |
| [**backlinks/**](./backlinks/) | Rascunhos de artigos / link building |
| [**ai-ops/**](./ai-ops/) | Workflow de IA, checklists de demo |
| [**architecture/**](./architecture/) | Cutover, guardrails, políticas |
| [**healthsafe-rpa/**](./healthsafe-rpa/) | Referência HealthSafe × RPA |
| [**_archive/**](./_archive/) | Migrações e relatórios históricos |

---

## Por tema

### Produto WhatsApp (público + técnico)

| Preciso de… | Documento |
|-------------|-----------|
| **Visão de produto (lançamento)** | [whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md](./whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md) |
| Setup Cloud API | [whatsapp/WHATSAPP-SETUP.md](./whatsapp/WHATSAPP-SETUP.md) |
| Ativação real (runbook) | [whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](./whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md) |
| Inbox SaaS | [whatsapp-platform/README.md](./whatsapp-platform/README.md) |

### CRM / vendas (portal, interno)

| Preciso de… | Documento |
|-------------|-----------|
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

---

## READMEs por área

- [crm/README.md](./crm/README.md)  
- [financeiro/README.md](./financeiro/README.md)  
- [whatsapp/README.md](./whatsapp/README.md)  
- [investigamais/README.md](./investigamais/README.md) (produto / app separado)  
- [shared/README.md](./shared/README.md)  
- [backlinks/README.md](./backlinks/README.md)  
