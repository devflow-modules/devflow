# Paridade — rotas portal (raiz) × `apps/whatsapp-platform`

Inventário para cutover: após **Bloco D**, a raiz **não** deve expor a coluna “Hoje na raiz” para operação WhatsApp; o canónico é o app.

| Área | Portal (legado / removido no D) | App canónico (`apps/whatsapp-platform`) |
|------|----------------------------------|----------------------------------------|
| Webhook Meta | `/api/webhook/whatsapp` | `/api/webhook/whatsapp` |
| Onboard API | `/api/whatsapp/onboard`, `callback`, `phone-numbers` | Rotas equivalentes sob `/api/whatsapp/*` (se existirem) ou só no app |
| Admin WhatsApp | `/api/admin/whatsapp/*` | Endpoints sob `/api/admin/*` no app |
| Conversas admin | `/api/admin/conversations` | `/api/admin/conversations` no app |
| Auth JWT | `/api/auth/login`, `logout`, `signup`, `verify`, `forgot-password`, `reset-password` | Mesmas rotas no app |
| UI dashboard número | `/dashboard/whatsapp`, `callback` | `/dashboard/whatsapp`, `callback` |
| Billing uso (produto) | `/dashboard/billing` | `/dashboard/billing` |
| Inbox / settings / automação | `/inbox`, `/settings`, `/onboarding`, `/automation` | Páginas equivalentes no app (`(protected)/*`, `settings`, etc.) |
| Login / recuperação | `/login`, `/forgot-password`, `/reset-password`, `/signup` | `login`, `signup`, `forgot-password`, `reset-password` |
| Admin métricas **produto** | — (na raiz: `/admin/metrics` é **outro** painel — financeiro/crescimento) | `/admin/metrics`, `/admin/billing`, conversas, agentes, filas |

**Marketing (permanece na raiz):** `/produtos/whatsapp-platform`, `/automacao-whatsapp*`, `/software-atendimento-whatsapp*`, `/chatbot-whatsapp*`.

**Variável:** `NEXT_PUBLIC_WHATSAPP_APP_URL` — base do app (produção típica: `https://whatsapp.devflowlabs.com.br`; local: `http://localhost:3000`).
