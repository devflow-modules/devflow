# /map-impact

## Objetivo

Mapa de impacto obrigatório antes de editar domínios sensíveis.

## Entradas

- Pedido de mudança
- App/domínio alvo

## Processo

1. Localizar owner (app vs package)
2. Listar persistência, auth, audit, realtime, UI, automação/IA
3. Identificar testes e docs canônicas
4. Declarar fora de escopo

Alinhar a skill [`whatsapp-platform-safe-change`](../skills/whatsapp-platform-safe-change.md) quando o domínio for WhatsApp.

## Saída obrigatória

```text
Domain:
App owner:
Package potential:
Persistence:
Tenant:
Auth/roles:
Audit:
Realtime:
UI/cache:
Automation/AI:
Tests:
Docs:
Out of scope:
```

## Restrições

- Produzir o mapa **antes** da primeira edição
- Não expandir escopo silenciosamente
