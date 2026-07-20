# /update-docs

## Objetivo

Atualizar apenas as fontes canônicas certas.

## Entradas

- Mudança de comportamento/contrato
- Domínio

## Processo

1. Papel Documentation Engineer
2. Consultar mapa do domínio (ex. WhatsApp `DOCUMENTATION-MAP.md`)
3. Determinar:

```text
canonical source:
docs to update:
docs that must NOT change:
duplication risk:
```

4. Preferir apontar para código/rules em vez de copiar listas frágeis

## Saída obrigatória

Lista de ficheiros tocados + justificativa + o que ficou de fora de propósito.

## Restrições

- Não criar segunda fonte da verdade
- Não atualizar CURRENT-SCOPE sem mudança material
- Se `route.ts` mudou contrato: `ROUTING_POLICY.md` (ou artefato aceite pelo gate)
