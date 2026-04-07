# WhatsApp Platform — smoke manual de auth (checklist)

Curto e executável. App: **`apps/whatsapp-platform`**. Ambiente: staging ou local com `JWT_SECRET` e dados de teste.

Marque cada item após verificar.

## Sessão e redirects

- [ ] **Sem sessão**, abrir `/dashboard` (ou `/inbox`) → redirect para `/login?next=…` com o path original na query.
- [ ] Fazer login → aterragem no destino de `next` (ou default `/dashboard/whatsapp` se `next` inválido).
- [ ] **`next` malicioso** (ex. `//evil.com`) → após login **não** redireciona para host externo (fica no default interno).

## Papéis e admin

- [ ] Utilizador **comum / agente**: aceder `/admin/metrics` (URL direta) → **não** vê métricas (redirect para `/dashboard` ou login conforme sessão).
- [ ] **Agente**: vê link **Distribuir** na sidebar (se shell carregar role); `/admin/distribuir` acessível com sessão válida.
- [ ] **Agente**: `/admin/agents` → bloqueado (redirect `/dashboard`).
- [ ] **Admin**: `/admin/metrics`, `/admin/agents` acessíveis com sessão válida; link **Admin** na sidebar visível.

## Logout e revogação

- [ ] **Logout** → ao navegar para área protegida, volta ao login com `next`.
- [ ] **API protegida** (ex. `GET /api/admin/conversations` com `Cookie`) após logout ou sessão revogada na DB → **401** `{ error: "Não autorizado" }`.

## Ops metrics (se configurado)

- [ ] `GET /api/ops/metrics` **sem** header, com `WHATSAPP_OPS_METRICS_SECRET` definido → **401**.
- [ ] Com header `X-Ops-Metrics-Key` correto → **200** e JSON do contrato.
- [ ] Em **produção** sem `WHATSAPP_OPS_METRICS_SECRET` → **503** (falha de configuração).

## Rate limit (opcional)

- [ ] `POST /api/auth/forgot-password` em rajada → eventual **429** com `code: "RATE_LIMITED"`.
- [ ] `POST /api/auth/login` / `reset-password` / `signup` em rajada → **429** coerente na UI (mensagem de aguardar).

## Forgot / reset password

- [ ] **Forgot**: submeter e-mail → estado “link enviado” (mensagem genérica); inputs preservados em erro (exceto após sucesso).
- [ ] **Reset** com `?token=` na URL → formulário sem campo de token visível (só nova senha + confirmar); opção “colar token” se o link falhar.
- [ ] Token expirado ou inválido (API) → mensagem distinta na UI (pedir novo e-mail vs link inválido).
- [ ] Reset com sucesso → redireciona ao login; sessões antigas invalidadas (testar outro separador / API após reset).

## UI auth (regressão rápida)

- [ ] Login: botão desativado durante pedido; não duplica submit; “Mostrar” senha funciona.
- [ ] Hierarquia visual semelhante entre login, signup, forgot, reset (cartão, título, descrição).

---

**Nota:** Em desenvolvimento, se `WHATSAPP_OPS_METRICS_SECRET` **não** estiver definido, `/api/ops/metrics` pode responder **200** sem header (comportamento intencional para DX).
