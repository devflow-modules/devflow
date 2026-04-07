# WhatsApp Platform — checklist UX operacional (pré-smoke)

Fecho **P2**: evitar quebras óbvias na homologação manual. Sem redesign.

## Páginas críticas

- [ ] `/login` — loading inicial (spinner) enquanto `verify` corre
- [ ] `/login` — erros de credenciais legíveis
- [ ] `/forgot-password` — estado de envio / mensagem de sucesso
- [ ] `/reset-password` — erros de token/senha
- [ ] `/dashboard/whatsapp` — empty state (sem números) compreensível
- [ ] Billing / planos (rotas expostas no menu) — loading e erro de API

## Responsividade básica

- [ ] Login e dashboard utilizáveis em viewport estreita (mobile)
- [ ] Botões e inputs não cortados

## Links internos

- [ ] “Esqueci minha senha” → `/forgot-password`
- [ ] Navegação principal do dashboard sem 404 óbvios

## Mensagens

- [ ] Auth: sem jargão técnico desnecessário
- [ ] Billing: falha de rede com texto acionável (“tente novamente”)

Este checklist é **manual**; marcar no [`WHATSAPP-PRODUCTION-SIGNOFF.md`](./WHATSAPP-PRODUCTION-SIGNOFF.md) quando aplicável.
