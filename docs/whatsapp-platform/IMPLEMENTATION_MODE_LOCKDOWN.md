# Implementation Mode Lockdown (WhatsApp Platform)

## Objetivo

Garantir que, em modo `IMPLEMENTATION` (ou `WHITE_LABEL`), utilizadores de tenant (`manager`/`operator`) nao veem dados comerciais self-service: billing, plano, limite, upgrade, Stripe, checkout, custo e metering.

## Variavel de ambiente

- `NEXT_PUBLIC_PRODUCT_MODE=IMPLEMENTATION` (default recomendado)
- Modos suportados: `SAAS`, `WHITE_LABEL`, `IMPLEMENTATION`
- Regra central: apenas `SAAS` permite visibilidade comercial completa (`isCommercialBillingVisible() === true`)

## O que cliente pode ver

- Operacao: inbox, conversas, automacoes, filas, equipa, saude operacional
- Configuracoes tecnicas: IA de atendimento, API/integracoes, configuracoes do tenant
- Metricas operacionais sem preco/limite comercial

## O que so DevFlow ve

- Ferramentas internas de plataforma (`/admin/*`)
- Billing interno (`/admin/billing`) para `platform_admin`
- Stripe/webhooks e rotinas de faturacao no backend

## Rotas ocultadas/bloqueadas (tenant)

- UI/nav: remove links de billing quando `!isCommercialBillingVisible()`
- Route guard (middleware): redirect para `/dashboard` em:
  - `/billing`
  - `/dashboard/billing`
  - `/settings/billing`
  - `/plan`
  - `/subscription`

## APIs sanitizadas/bloqueadas

- `/api/billing/*`: sanitiza payload para usuario comum em modo nao-SaaS
- `/api/stripe/*`: bloqueio de escrita (checkout/portal/upgrade) para usuario comum em modo nao-SaaS
- `/api/tenants/me`: remove campos comerciais (ex.: plan/activeUntil) para usuario comum
- `/api/ai/usage`: remove tokens e custo estimado para usuario comum
- Erros de gating: sem termos de plano/upgrade/Stripe no modo nao-SaaS

## Mensagens seguras (modo implementation/white-label)

- "Capacidade temporariamente indisponivel. Contacte o suporte."
- "Esta funcionalidade nao esta ativa na configuracao atual da operacao."

## Resultado da auditoria de busca (classificacao)

Palavras auditadas: `billing`, `stripe`, `plan`, `plano`, `upgrade`, `subscription`, `assinatura`, `limite`, `limit`, `usage`, `consumo`, `overage`, `fatura`, `checkout`, `metered`, `price`, `preco`.

Classificacao aplicada:

- **Permitido interno**: `src/app/admin/*`, `src/modules/stripe/*`, `src/modules/billing/admin/*`, webhooks e cron internos.
- **Ocultar UI**: `nav-config`, `AppSidebar`, paginas `/billing`, `/dashboard/billing`, `/settings/billing`, command palette.
- **Sanitizar API**: `billingSanitizer` + rotas `/api/billing/*`, `/api/ai/usage`, `/api/tenants/me`.
- **Bloquear rota**: middleware para caminhos comerciais.
- **Documentacao interna**: arquivos em `docs/whatsapp-platform/*` com contexto comercial/Stripe.

## Checklist QA (manager/operator)

- [ ] `/dashboard` sem bloco comercial (plano/upgrade/fatura/stripe)
- [ ] `/inbox` e conversa aberta sem copy de billing
- [ ] `/settings` sem atalhos de plano/faturacao
- [ ] acesso manual a `/billing` redireciona para `/dashboard`
- [ ] acesso manual a `/settings/billing` redireciona para `/dashboard`
- [ ] sem textos de upgrade/plano/limite comercial no fluxo operacional

## Checklist QA (platform_admin)

- [ ] `/admin/billing` segue acessivel
- [ ] demais ferramentas internas continuam acessiveis
- [ ] backend interno de Stripe/billing permanece operacional
