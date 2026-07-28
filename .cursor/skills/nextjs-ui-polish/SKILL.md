---
name: nextjs-ui-polish
description: >-
  Faz ajustes visuais em interfaces Next.js usando componentes e tokens
  existentes, sem mudar regras de negócio ou contratos HTTP. Use para
  acessibilidade, responsividade e consistência visual.
---

# Next.js — UI polish

## Objetivo

Melhorar apresentação, acessibilidade e responsividade com um diff visual pequeno que preserve routing, auth, analytics e contratos. Capacidade: `action-enabled`.

## Gatilhos de uso

- Ajuste de layout, espaçamento, tipografia ou responsividade.
- Correção visual ou de acessibilidade.
- Alinhamento com `packages/ui` ou design system do app.
- Estados visuais de loading, vazio ou erro já definidos pelo produto.

Não usar quando o pedido muda regra de negócio, contrato HTTP, autorização ou routing.

## Entradas obrigatórias

- Tela, componente e estado visual alvo.
- Critério visual verificável e larguras relevantes.
- Componentes irmãos, tokens e padrões do app.
- [`AGENTS.md`](../../../AGENTS.md) e [rule de Next.js](../../rules/03-nextjs-app-router.mdc).
- No WhatsApp Platform: [rule de design](../../rules/whatsapp-platform-design.mdc) e [`DESIGN_SYSTEM.md`](../../../apps/whatsapp-platform/docs/DESIGN_SYSTEM.md).

## Fluxo operacional

1. Inspecionar componente, rota, estados, tokens e testes vizinhos.
2. Confirmar boundary entre Server e Client Components e proteção da rota.
3. Reutilizar componente, token ou classe existente antes de criar estilo novo.
4. Implementar somente a mudança visual autorizada.
5. Preservar eventos, atributos `data-*`, focus management e hooks de tracking.
6. Verificar estados e breakpoints relevantes, incluindo overflow, teclado e contraste.
7. Executar testes direcionados e verificação visual.

## Guardrails

- Não mover lógica sensível para o cliente.
- Não alterar APIs, middleware, `next.config`, paths ou cutover sem pedido explícito.
- Não introduzir paleta, sombra ou token ad hoc.
- Não copiar estilos entre produtos sem alinhamento de design system.
- Não remover analytics, labels acessíveis ou estados existentes.
- Não afirmar paridade visual sem inspeção executada.

## Stop conditions

Parar e pedir decisão quando:

- o design de referência ou critério visual estiver ambíguo;
- a mudança exigir regra de produto ou contrato novo;
- houver conflito entre design e acessibilidade;
- o componente correto pertencer a `packages/ui` e a alteração ampliar o escopo;
- não for possível acessar o estado necessário sem credencial ou dado real.

## Validações

- Executar teste de UI/smoke mais próximo e lint aplicável.
- Verificar visualmente as larguras e estados definidos na entrada.
- Conferir navegação por teclado e nome acessível quando a interação mudar.
- Registrar screenshots ou checklist manual quando não houver teste automatizado.
- Marcar validações como `pass`, `fail`, `blocked` ou `not run`.

## Formato da entrega

```text
Visual target:
Changes:
Tokens / components reused:
Viewport and states checked:
Automated tests:
Accessibility:
Blocked / not run:
Residual differences:
```
