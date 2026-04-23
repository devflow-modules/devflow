# Ecossistema DevFlow Labs

Documentação transversal ao domínio **devflowlabs.com.br**: rotas, topologia, fluxos e deploys. Serve **engenharia**, **produto** e **apresentação** (executivo / comercial).

**Foco público atual** no hub: **WhatsApp Platform** e **Financeiro**; CRM interno em [`/admin/leads`](../crm/LEADS-CRM.md). Visão de produto WhatsApp: [WHATSAPP-PLATFORM-OVERVIEW](../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md).

## Índice

| Documento | Quando usar |
|-----------|-------------|
| [TOPOLOGIA-DEVFLOW.md](./TOPOLOGIA-DEVFLOW.md) | **Onde** cada parte roda: app raiz vs `apps/*`, backbone `/api/*`, serviços externos. |
| [FLUXOGRAMA-DEVFLOW.md](./FLUXOGRAMA-DEVFLOW.md) | **Como** requests, usuários e integrações circulam: middleware (JWT / sessão Supabase / público), billing, Financeiro, WhatsApp em duas camadas. |
| [ROTAS-ECOSSISTEMA-DEVFLOWLABS.md](./ROTAS-ECOSSISTEMA-DEVFLOWLABS.md) | **Referência** de rotas de páginas e APIs no app raiz; callbacks de auth; apps opcionais no monorepo. |

**Resumo:** **Topologia** = mapa de deploy e peças; **Fluxograma** = tráfego e jornadas; **Rotas** = tabela detalhada de URLs.

## Leitura sugerida

1. [TOPOLOGIA-DEVFLOW.md](./TOPOLOGIA-DEVFLOW.md) — visão de conjunto.  
2. [FLUXOGRAMA-DEVFLOW.md](./FLUXOGRAMA-DEVFLOW.md) — middleware e fluxos comerciais/técnicos.  
3. [ROTAS-ECOSSISTEMA-DEVFLOWLABS.md](./ROTAS-ECOSSISTEMA-DEVFLOWLABS.md) — consulta pontual de path ou API.

**Monorepo e boundaries:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md).

**Cutover e homologação:** [../architecture/CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](../architecture/CUTOVER-WHATSAPP-RUNBOOK-MAIN.md) · [../architecture/CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md](../architecture/CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md) · [../architecture/WHATSAPP-CUTOVER-HOMOLOGACAO.md](../architecture/WHATSAPP-CUTOVER-HOMOLOGACAO.md).

**WhatsApp — pré-smoke e sign-off:** [../architecture/WHATSAPP-PRODUCTION-SIGNOFF.md](../architecture/WHATSAPP-PRODUCTION-SIGNOFF.md) · [../architecture/WHATSAPP-PRE-SMOKE-AUTOMATION.md](../architecture/WHATSAPP-PRE-SMOKE-AUTOMATION.md).
