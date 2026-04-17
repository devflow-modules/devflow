# Estratégia WHITE_LABEL

## Objetivo de produto

Entregar a mesma **plataforma técnica** (inbox, agentes, WhatsApp, IA) a um cliente que **não** vende o produto como SaaS self-service: o utilizador final **não vê** fluxos de pagamento, nomes de plano comercial, preços ou detalhes de subscrição Stripe. A **operação comercial** (contrato, faturação externa, limites acordados) fica fora da aplicação ou é tratada por equipa interna.

## Princípios técnicos

1. **Single codebase**: não há fork; `NEXT_PUBLIC_PRODUCT_MODE=WHITE_LABEL` altera UI e contratos HTTP.
2. **Backend completo**: webhooks Stripe, sincronização de tenant, enforcement de limites e serviços de billing **continuam** a correr — necessários para relatórios, consistência e futura reativação SAAS.
3. **Defesa em profundidade**: ocultar links na sidebar não basta; as rotas `/api/...` aplicam **sanitização** (`billingSanitizer`) para perfis não privilegiados.
4. **Staff**: utilizadores com papel adequado (`platform_admin` / `admin` conforme rota) podem ver dados completos para suporte e operações.

## Superfície afetada (resumo)

- Navegação: entradas de faturação podem estar ausentes ou desativadas para managers em WL.
- Componentes como `BillingAlerts` e `PricingContextHint` devolvem **`null`** em WL — mantêm-se para o modo SAAS sem duplicar árvores de componentes.
- `POST /api/auth/signup`: em WL, sem checkout Stripe no fluxo público (resposta orienta onboarding manual quando aplicável).
- `GET /api/tenants/me`: campos `plan` / `activeUntil` omitidos para utilizadores sanitizados.

## Tipos e contratos

Tipos TypeScript de referência para respostas seguras: `src/types/whiteLabelContracts.ts` (reexporta sanitização e tipos derivados de `billingSanitizer`).

## Leitura adicional

- [API_CONTRACT.md](./API_CONTRACT.md)
- [PRODUCT_MODE.md](./PRODUCT_MODE.md)
- [ENFORCEMENT_ARCHITECTURE.md](./ENFORCEMENT_ARCHITECTURE.md)
