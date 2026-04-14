# Plano FREE vs planos pagos — uso e faturação

## Por que existe esta distinção

- **FREE** não exige cartão nem subscrição Stripe. Não há base para cobrar **uso adicional** de forma segura e previsível.
- **STARTER / PRO / SCALE** são planos pagos com cliente Stripe: o volume **além do incluído** pode ser registado e faturado (meter / fatura), conforme configuração do produto.

## Comportamento

| Aspeto | FREE | STARTER / PRO / SCALE |
|--------|------|------------------------|
| Limite incluído | Sim (`plans.ts`) | Sim |
| Continuar além do incluído | **Não** — bloqueio no enforcement | Sim — uso adicional faturado |
| Cobrança variável (expansão) | **Não** | Sim (mensagens e IA conforme integração Stripe) |
| Código de erro típico ao limite | `FREE_PLAN_LIMIT_REACHED` | `USAGE_LIMIT_EXCEEDED` (mensagens, se enforcement global ativo) |

## Fontes de verdade

- Limites numéricos: `src/modules/billing/plans.ts`
- Helper: `planAllowsMeteredOverage()` — `false` apenas para FREE
- Enforcement: `src/modules/billing/enforcementService.ts`
- IA meter (overage): `src/modules/billing/stripeUsageBillingService.ts` (FREE retorna cedo; pagos com `used >= limit`)
- UI: `allowsMeteredOverage` em `getUsageDashboard` / `getTenantBillingUI` — FREE não mostra narrativa de “expansão paga”

## UI

- **FREE**: `HowFreePlanWorksSection` — limite gratuito, CTA para escolher plano, sem preço de expansão
- **Pagos**: `HowUsageWorksSection` — incluído + expansão + preços unitários de referência

## Ativação gratuita vs operação paga

- **Ativação gratuita (FREE)**: explorar inbox, WhatsApp e IA dentro dos limites incluídos; ao atingir o limite, **upgrade obrigatório** para continuar.
- **Operação paga**: mesmo pacote incluído por nível; crescimento além do pacote entra em **uso adicional** com transparência na fatura (nomes de linha alinhados ao Stripe).
