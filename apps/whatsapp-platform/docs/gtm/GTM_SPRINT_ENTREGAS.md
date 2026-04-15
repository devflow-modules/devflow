# GTM — Implantação + Plataforma (entregas no código e material)

Documento operacional alinhado à sprint de reposicionamento (venda consultiva, sem SaaS genérico).

## Proposta comercial (estrutura para PDF / Notion)

1. **Problema** — Caos no WhatsApp: conversas espalhadas, respostas lentas, leads sem dono.
2. **Solução** — Uma operação organizada: inbox única, equipa, prioridade, automação e IA com controlo.
3. **O que está incluído** — Inbox profissional, utilizadores, automação inicial, CRM leve (funil / lead), suporte na implantação.
4. **Benefícios** — Menos perda de contacto, mais rapidez, visibilidade do que está por responder.
5. **Implantação** — Valor único (ex.: R$ 500–1.500) conforme complexidade acordada.
6. **Mensalidade** — Pacote operacional (ex.: R$ 97–297) + ajuste de volumes quando necessário.
7. **Próximos passos** — Diagnóstico curto → demonstração → contrato → ligação do número → go-live.

## Pitch curto (WhatsApp)

> Implementámos um sistema que organiza o atendimento no WhatsApp: separa conversas, distribui pela equipa, automatiza a primeira resposta e dá controlo total da operação.

## Duas ofertas

- **Simples:** implantação + mensal (pacote base).
- **Premium:** implantação + automações avançadas + filas + suporte prioritário (refletir no contrato).

## Abordagem (DM)

> Olá [nome], vi que vocês atendem muito pelo WhatsApp. Implementámos um sistema que organiza o atendimento, distribui pela equipa e evita perder clientes. Posso mostrar em 15 minutos como funciona?

## Checklist de onboarding (manual)

1. Ligar número (Meta / Cloud API).
2. Ativar webhook e validar eventos.
3. Enviar mensagem de teste (inbound + resposta).
4. Marcar tenant `IMPLANTADO` na base (campo `gtm_lifecycle`) após go-live.

## Estado no produto

- Plano efetivo pago: `OPERATIONAL_BASE` (`plans.ts`, Stripe metadata recomendado).
- Ciclo de vida comercial: `Tenant.gtmLifecycle` = `AVALIACAO` | `IMPLANTADO`.
- Uso: eventos existentes (`UsageEvent`, agregados) + alerta interno ao cruzar 5000 mensagens no período (audit log).
