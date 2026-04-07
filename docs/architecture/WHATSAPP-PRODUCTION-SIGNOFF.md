# WhatsApp Platform — Production Sign-off

Documento vivo: após a **sprint pré-smoke**, preencher apenas o **smoke manual em produção** e a **secção de resultado final**.

---

## 1. Status pré-smoke (repositório)

Entregue no código / CI / documentação (não substitui validação humana no ar):

- [x] Deploy separado do `apps/whatsapp-platform` e cutover documentados (`ARCHITECTURE.md`, runbooks)
- [x] Redirects do portal (**308** via `@devflow/whatsapp-routes` + `NEXT_PUBLIC_WHATSAPP_APP_URL`)
- [x] Auth readiness — rotas endurecidas, `logAuth`, testes Vitest → [WHATSAPP-AUTH-VALIDATION.md](./WHATSAPP-AUTH-VALIDATION.md)
- [x] Webhook hardening — GET/POST, logs, testes → [WHATSAPP-WEBHOOK-HARDENING.md](./WHATSAPP-WEBHOOK-HARDENING.md)
- [x] Billing readiness — guia e testes de API/módulos → [WHATSAPP-BILLING-VALIDATION.md](./WHATSAPP-BILLING-VALIDATION.md)
- [x] Observabilidade mínima — prefixos e pontos de log → [WHATSAPP-OBSERVABILITY-MINIMUM.md](./WHATSAPP-OBSERVABILITY-MINIMUM.md)
- [x] Guardrails CI — script + workflow → [WHATSAPP-ARCHITECTURE-GUARDRAILS.md](./WHATSAPP-ARCHITECTURE-GUARDRAILS.md)
- [x] Automação pré-smoke — matriz de workflows e `vitest` → [WHATSAPP-PRE-SMOKE-AUTOMATION.md](./WHATSAPP-PRE-SMOKE-AUTOMATION.md)
- [x] UX operacional — checklist manual → [WHATSAPP-UX-READY-CHECKLIST.md](./WHATSAPP-UX-READY-CHECKLIST.md)

---

## 2. Smoke test manual pendente (produção)

Marcar após executar no ambiente real:

- [ ] Entrar pelo portal
- [ ] Redirecionar para o app (308)
- [ ] Fazer login
- [ ] Acessar dashboard WhatsApp
- [ ] Enviar mensagem real para o número oficial
- [ ] Confirmar recepção no sistema
- [ ] Confirmar persistência (DB / inbox)
- [ ] Confirmar resposta ou roteamento (IA / legado)
- [ ] Validar billing (página / checkout / portal Stripe conforme escopo)
- [ ] Validar logout e novo login

**Detalhe opcional (tabela):**

| # | Passo | OK / NOK | Notas |
|---|--------|----------|--------|
| 1 | Portal → app | | |
| 2 | Login | | |
| … | … | | |

---

## 3. Gate técnico final (“100%” com evidência)

Só marcar com prova (logs, prints, CI verde no merge de release):

- [ ] App sobe sem erro em produção (`whatsapp-platform`)
- [ ] Login e fluxo auth completos no domínio real
- [ ] Webhook GET (challenge Meta) e POST (evento ou mensagem real)
- [ ] Mensagem real recebida, persistida e roteada conforme esperado
- [ ] Redirects do portal corretos
- [ ] Billing acessível em produção (Stripe live quando aplicável)
- [ ] CI passando (incl. **Routing governance**, **WhatsApp architecture guard**, `vitest` no app)
- [ ] Docs de operação atualizadas (`docs/whatsapp/*`, `docs/architecture/WHATSAPP-*.md`)

---

## 4. Resultado final

| Campo | Valor |
|--------|--------|
| **Data** | |
| **Ambiente** | _ex.: Vercel `whatsapp-platform` + portal `devflowlabs.com.br`_ |
| **Responsável** | |
| **Resultado** | _APROVADO / APROVADO COM RESSALVAS / REPROVADO_ |
| **Observações** | |
| **Commit / release** | |

---

## 5. Definição de pronto

> O WhatsApp Platform está isolado, validado em produção, com fluxos críticos operacionais, CI estável, webhook funcional, auth funcional, billing funcional e proteção mínima contra regressão.

---

## 6. Referências

- Sprint e prioridades: [WHATSAPP-SPRINT-FECHAMENTO.md](./WHATSAPP-SPRINT-FECHAMENTO.md)
- Cutover: [WHATSAPP-CUTOVER-HOMOLOGACAO.md](./WHATSAPP-CUTOVER-HOMOLOGACAO.md)
- Rotas ecossistema: [../ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md](../ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md)
- Meta webhook: [../whatsapp/WEBHOOK_META_CHECKLIST.md](../whatsapp/WEBHOOK_META_CHECKLIST.md)
