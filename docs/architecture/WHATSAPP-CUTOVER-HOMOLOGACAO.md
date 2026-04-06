# Homologação — cutover WhatsApp (checklist operacional)

Script automático: [`scripts/ops/validate-whatsapp-cutover.sh`](../../scripts/ops/validate-whatsapp-cutover.sh)  
Runbook: [CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](./CUTOVER-WHATSAPP-RUNBOOK-MAIN.md)

## Permissão (uma vez)

```bash
chmod +x scripts/ops/validate-whatsapp-cutover.sh
```

## Comandos

**Básico (sem handshake Meta):**

```bash
PORTAL_URL="https://devflowlabs.com.br" \
WHATSAPP_APP_URL="https://whatsapp.devflowlabs.com.br" \
./scripts/ops/validate-whatsapp-cutover.sh
```

**Com token real de verificação do webhook:**

```bash
PORTAL_URL="https://devflowlabs.com.br" \
WHATSAPP_APP_URL="https://whatsapp.devflowlabs.com.br" \
VERIFY_TOKEN="SEU_VERIFY_TOKEN" \
./scripts/ops/validate-whatsapp-cutover.sh
```

**Modo rígido + rastreio de redirects:**

```bash
PORTAL_URL="https://devflowlabs.com.br" \
WHATSAPP_APP_URL="https://whatsapp.devflowlabs.com.br" \
VERIFY_TOKEN="SEU_VERIFY_TOKEN" \
STRICT_MODE=1 \
TRACE_REDIRECTS=1 \
./scripts/ops/validate-whatsapp-cutover.sh
```

---

## Bloco A — Portal

- [ ] `/dashboard/whatsapp` redireciona para o app
- [ ] `/login`, `/forgot-password`, `/reset-password` redirecionam para o app
- [ ] `/`, `/produtos`, `/ferramentas`, `/ferramentas/whatsapp` continuam no portal (sem redirect indesejado para o app WhatsApp)
- [ ] Rotas antigas de API WhatsApp não estão operacionais no portal (404/401/403 ou redirect para o app)

## Bloco B — App

- [ ] `/login` responde (200 ou redirecionamento esperado)
- [ ] `/dashboard/whatsapp` existe (200 ou 401 se protegido)
- [ ] Auth básica não depende do portal

## Bloco C — Webhook

- [ ] Handshake GET com token real devolve o `hub.challenge`
- [ ] POST com payload de teste responde 200/202
- [ ] (Manual) Mensagem real no número oficial chega ao sistema

## Bloco D — Produção

- [ ] `NEXT_PUBLIC_WHATSAPP_APP_URL` definido no deploy do portal
- [ ] Domínio do app (ex.: `whatsapp.devflowlabs.com.br`) resolve e TLS OK
- [ ] Logs do app sem 500 recorrentes após testes

---

## Sequência de evidências (pós-execução)

1. Colar saída completa do script (Etapas 1 e 2).
2. Se falhar: erros Vercel / build / runtime relevantes.
3. Evidência opcional: teste real de mensagem WhatsApp (screenshot ou ID de conversa).

---

## CI

Workflow: [`.github/workflows/validate-whatsapp-cutover.yml`](../../.github/workflows/validate-whatsapp-cutover.yml) — roda o script em `push` na `main` (paths filtrados) e em `workflow_dispatch`.

Em `workflow_dispatch` dá para sobrescrever URLs e `strict_mode` pelos inputs (defaults: portal e app de produção). Em `push`, o contexto `inputs` fica vazio e o script usa os mesmos defaults.

**Secret** (opcional): `WHATSAPP_VERIFY_TOKEN` — habilita handshake GET no CI. O aviso do editor “context access might be invalid” para esse nome some depois de criares o secret no repositório (ou podes ignorar: o workflow corre com token vazio e o script só omite o handshake).

### Middleware Edge (produção)

O `src/middleware.ts` lê `NEXT_PUBLIC_WHATSAPP_APP_URL` e passa a base a `getWhatsappCutoverRedirectUrl(..., appBaseOverride)` para o valor ser **inlined no chunk Edge** (evita `process.env` vazio dentro do pacote `@devflow/whatsapp-routes` no bundle do middleware). Confirma `transpilePackages` com `@devflow/whatsapp-routes` em `next.config.ts` e **redeploy** do projeto Vercel que serve **devflowlabs.com.br** após definir a env.
