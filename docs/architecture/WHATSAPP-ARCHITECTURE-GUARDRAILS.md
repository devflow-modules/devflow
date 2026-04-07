# WhatsApp Platform — guardrails de arquitetura (CI)

Objetivo: **impedir regressão** do cutover — lógica operacional do WhatsApp de volta ao app raiz (`src/` do portal).

## O que o CI valida

Script: `scripts/ci/check-whatsapp-architecture-boundary.sh`

1. **Imports proibidos** em `src/` (portal):  
   - alias `from "...@wa/`  
   - `from "...apps/whatsapp-platform"`  
   - `require("...apps/whatsapp-platform")`

2. **Paths proibidos** (existência de ficheiros/pastas):  
   - `src/app/api/webhook/whatsapp`  
   - `src/app/api/webhooks/whatsapp`  
   - `src/app/api/whatsapp`

Marketing e landings em `/produtos/whatsapp-platform` **não** são bloqueados.

## Workflow

`.github/workflows/whatsapp-architecture-guard.yml` — corre em **push** e **pull_request** para `main` / `master`.

## Alinhamento com governança de rotas

- `routing-governance-check.yml` — alterações a `page.tsx` / `route.ts` exigem atualização de `routing-governance.ts` e docs de política.
- **WhatsApp architecture guard** — complementar: fronteira **portal × app** dedicado.

## Execução local

```bash
bash scripts/ci/check-whatsapp-architecture-boundary.sh
```

## Falso positivo

Se um futuro refactor legítimo precisar de um destes paths, atualizar **explicitamente** a política em `docs/architecture/ROUTING_POLICY.md` e ajustar o script com comentário de exceção (evitar silenciosamente).
