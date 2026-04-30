# CRM comercial (portal)

Documentação do **CRM mínimo** embutido no portal DevFlow (`devflowlabs.com.br`) para prospecção outbound, follow-up e ligação leve ao WhatsApp.

**Público:** equipa comercial interna (rotas `/admin/*` protegidas).

**Arquitetura unificada (Inbox vs portal vs webhook):** [CRM-ARCHITECTURE.md](./CRM-ARCHITECTURE.md).

---

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [CRM-ARCHITECTURE.md](./CRM-ARCHITECTURE.md) | Fonte de verdade (Inbox), portal interno, integração externa |
| [CRM-DEDUPE-AND-PORTAL-LINK.md](./CRM-DEDUPE-AND-PORTAL-LINK.md) | `outboundLeadId`, dedupe, automação inbound futura, `Lead.tenantId` |
| [LEADS-CRM.md](./LEADS-CRM.md) | `/admin/leads` — ciclo de vida, status, conversão, conversa |
| [LEAD-FINDER.md](./LEAD-FINDER.md) | `/admin/lead-finder` — Maps, presets, cadastro rápido |
| [FOLLOW-UP-ENGINE.md](./FOLLOW-UP-ENGINE.md) | Parados, urgência, “Ações de hoje”, sugestões |
| [MESSAGE-TEMPLATES.md](./MESSAGE-TEMPLATES.md) | Templates WhatsApp e `wa.me` |

---

## APIs relacionadas (referência)

- `GET/POST /api/admin/leads` — listagem, resumo de funil, criação  
- `PATCH /api/admin/leads/:id` — atualização parcial (incl. `conversationRef`)  
- `POST /api/admin/leads/:id/convert` — marcação de conversão comercial  

Autenticação: ver `src/lib/admin-leads-api-auth.ts` — em **produção**: segredo métricas admin (legado Ops) **ou** JWT WhatsApp Platform com papel **`platform_admin`**; páginas `layout.tsx` em `/admin/leads` e `/admin/lead-finder` alinham o mesmo requisito em SSR.

---

## Ligações úteis

- Visão de produto WhatsApp: [../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md](../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md)  
- Setup técnico Cloud API (não é CRM): [../whatsapp/WHATSAPP-SETUP.md](../whatsapp/WHATSAPP-SETUP.md)
