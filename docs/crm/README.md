# CRM comercial (portal)

Documentação do **CRM mínimo** embutido no portal DevFlow (`devflowlabs.com.br`) para prospecção outbound, follow-up e ligação leve ao WhatsApp.

**Público:** equipa comercial interna (rotas `/admin/*` protegidas).

---

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [LEADS-CRM.md](./LEADS-CRM.md) | `/admin/leads` — ciclo de vida, status, conversão, conversa |
| [LEAD-FINDER.md](./LEAD-FINDER.md) | `/admin/lead-finder` — Maps, presets, cadastro rápido |
| [FOLLOW-UP-ENGINE.md](./FOLLOW-UP-ENGINE.md) | Parados, urgência, “Ações de hoje”, sugestões |
| [MESSAGE-TEMPLATES.md](./MESSAGE-TEMPLATES.md) | Templates WhatsApp e `wa.me` |

---

## APIs relacionadas (referência)

- `GET/POST /api/admin/leads` — listagem, resumo de funil, criação  
- `PATCH /api/admin/leads/:id` — atualização parcial (incl. `conversationRef`)  
- `POST /api/admin/leads/:id/convert` — marcação de conversão comercial  

Autenticação: ver `src/lib/admin-leads-api-auth.ts` e variáveis `ADMIN_METRICS_SECRET` / cookie em produção (`src/middleware.ts`).

---

## Ligações úteis

- Visão de produto WhatsApp: [../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md](../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md)  
- Setup técnico Cloud API (não é CRM): [../whatsapp/WHATSAPP-SETUP.md](../whatsapp/WHATSAPP-SETUP.md)
