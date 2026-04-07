# WhatsApp Platform — sign-off de produção

Documento vivo: preencher após homologação real. Serve como **gate de pronto** e registo auditável.

---

## 1. Gate técnico (obrigatório para “100%”)

Marcar só após evidência (manual ou CI):

- [ ] App sobe sem erro em produção (deploy `apps/whatsapp-platform`)
- [ ] Login funciona no host do app
- [ ] Fluxo de auth completo validado (signup se aplicável → JWT → dashboard)
- [ ] Webhook GET validado (challenge Meta)
- [ ] Webhook POST validado (evento de teste ou mensagem real)
- [ ] Mensagem real recebida e processada (inbox / logs)
- [ ] Redirects do portal corretos (**308** para `NEXT_PUBLIC_WHATSAPP_APP_URL` nos paths do pacote `@devflow/whatsapp-routes`)
- [ ] Billing acessível (página / checkout / portal Stripe conforme escopo)
- [ ] CI passando (incl. `Routing governance` e **WhatsApp architecture guard**)
- [ ] Docs finais alinhadas ao cutover (`docs/whatsapp/*`, `apps/whatsapp-platform/docs/*`)

---

## 2. Registo de homologação (preencher)

| Campo | Valor |
|--------|--------|
| **Data** | _AAAA-MM-DD_ |
| **Ambiente** | _ex.: produção Vercel `whatsapp-platform` + portal `devflowlabs.com.br`_ |
| **Executor** | _nome_ |
| **Versão / commit** | _SHA ou release_ |

### 2.1 Smoke ponta a ponta (P0)

| # | Passo | Resultado (OK / NOK) | Notas |
|---|--------|----------------------|--------|
| 1 | Entrar pelo portal | | |
| 2 | Navegar para o app (redirect esperado) | | |
| 3 | Login | | |
| 4 | Acessar dashboard WhatsApp | | |
| 5 | Enviar mensagem real ao número | | |
| 6 | Confirmar recepção no sistema | | |
| 7 | Confirmar persistência (DB / inbox) | | |
| 8 | Confirmar resposta ou roteamento (IA / legado) | | |
| 9 | Billing: página, upgrade ou fluxo mínimo | | |
| 10 | Logout e novo login | | |

### 2.2 Auth e sessão (P1)

- [ ] Sem loop de redirect login ↔ app
- [ ] `next=` após login respeitado quando aplicável
- [ ] Forgot / reset password (se exposto) no domínio correto
- [ ] Cookies coerentes no domínio real (SameSite / domínio)

### 2.3 Webhook — confiabilidade mínima (P1)

- [ ] JSON inválido → **400** + log
- [ ] Payload não normalizável → **200** `ok` + log (Meta não fica em retry infinito por ack)
- [ ] Erro interno inesperado → log com contexto + **200** `ok` (ver política em código)
- [ ] Tenant desconhecido → **200** + log (não derrubar endpoint)

### 2.4 Billing operacional (P0/P1)

- [ ] Página de billing abre
- [ ] Checkout abre
- [ ] Customer portal Stripe abre (se usado)
- [ ] Plano atual coerente com Stripe / DB
- [ ] Upgrade / downgrade / cancel não quebram UI (testar o que existir)

### 2.5 Qualidade rápida (P2)

- [ ] Loading / empty / error states aceitáveis nas rotas críticas
- [ ] Mobile básico (dashboard / login)
- [ ] Mensagens de erro legíveis
- [ ] Links internos principais sem 404

---

## 3. Observabilidade mínima

Em incidente, os logs devem permitir responder:

- **Onde:** rota / fase (ex.: `[WHATSAPP][ERROR]` no webhook)
- **Tenant:** quando resolvido (`tenantId` nos logs de processamento)
- **Status HTTP** devolvido ao cliente (Meta, browser)

Prefixos úteis no app WhatsApp: `[WHATSAPP]`, `[WHATSAPP][ERROR]`, `[WHATSAPP][DEBUG]`, `[WHATSAPP][INFO]`.

---

## 4. Referências

- Plano de execução e prioridades: [`WHATSAPP-SPRINT-FECHAMENTO.md`](./WHATSAPP-SPRINT-FECHAMENTO.md)
- Cutover e rotas: [`WHATSAPP-CUTOVER-HOMOLOGACAO.md`](./WHATSAPP-CUTOVER-HOMOLOGACAO.md), `docs/ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md`
- Checklist Meta: `docs/whatsapp/WEBHOOK_META_CHECKLIST.md`

---

## 5. Definição de pronto (copiar no fechamento)

> O WhatsApp Platform está isolado, validado em produção, com fluxos críticos operacionais, CI estável, webhook funcional, auth funcional, billing funcional e proteção mínima contra regressão.

_Assinatura / data quando o gate da secção 1 estiver 100% marcado com evidência._
