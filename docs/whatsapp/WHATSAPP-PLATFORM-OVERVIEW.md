# Visão geral — produto WhatsApp Platform (DevFlow)

Documento de **posicionamento e âmbito** do produto de automação de atendimento no WhatsApp. Para instalação técnica (tokens, webhook, WABA), use [WHATSAPP-SETUP.md](./WHATSAPP-SETUP.md).

---

## O que é

A **WhatsApp Platform** DevFlow é a oferta de **atendimento e vendas no WhatsApp** com organização de fila, respostas, operadores e automação assistida por IA — pensada para PMEs e equipas comerciais que já vivem no WhatsApp e precisam de **menos caos** e **mais rastreio**.

---

## Problema que resolve

- Conversas espalhadas em telemóveis pessoais, sem histórico partilhado.  
- Respostas lentas ou duplicadas entre vendedores.  
- Dificuldade em medir **resposta**, **demo** e **fecho** de forma consistente.  
- Onboarding de número **oficial** (Meta WhatsApp Cloud API) sem “gambiarras” de integrador não documentado.

---

## Para quem é

- Negócios com volume recorrente de mensagens no WhatsApp (clínicas, lojas, serviços, B2B leve).  
- Equipas que querem **inbox** com contexto e, quando aplicável, **robô** para primeiro nível de triagem.

---

## Grandes módulos (ecossistema DevFlow)

| Módulo | Onde vive | Função |
|--------|-----------|--------|
| **Portal público** | App Next na **raiz** do monorepo | Marketing, SEO, `/demo`, páginas de produto, pricing, blog |
| **Demo** | Portal (`/demo`, fluxos guiados) | Prova de valor rápida sem login |
| **CRM comercial interno** | Portal — `/admin/leads`, `/admin/lead-finder` | Leads outbound, follow-up, templates `wa.me`, conversão e ponte `conversationRef` |
| **Inbox / chat** | App **`apps/whatsapp-platform`** | Operação multi-tenant, conversas, agentes |
| **Motor de follow-up (CRM)** | Lógica derivada no `GET` leads | “Parados”, “Ações de hoje”, sugestões — sem persistência de tarefas |
| **Conversão comercial** | API `POST …/convert` + campos no lead | Registo de conversão sem criar tenant automaticamente |

A **Cloud API oficial da Meta** é a base de envio/receção de mensagens no produto canónico; o portal reúne **aquisição** e **CRM leve**; a **operação pesada** concentra-se no app WhatsApp Platform.

---

## Relação com Meta / WhatsApp Cloud API

- Uso da **WhatsApp Business Platform (Cloud API)** conforme documentação Meta: número de negócio, templates onde aplicável, webhooks assinados.  
- O produto posiciona-se como **camada DevFlow** (inbox, regras, billing próprio onde existir) **em cima** da API pública — não é um cliente não oficial do protocolo WhatsApp.

---

## Posicionamento para lançamento

- **Foco comercial atual** no hub `devflowlabs.com.br`: narrativa e conversão em torno da **automação WhatsApp** + **demo**; ferramenta **Financeiro** como segundo produto ativo no ecossistema.  
- O CRM em `/admin/leads` é **ferramenta interna** de vendas DevFlow (não é landing pública), mas alinha a equipa com o mesmo funil que o site descreve.

---

## Documentação relacionada

| Tema | Documento |
|------|-------------|
| CRM portal | [../crm/README.md](../crm/README.md) |
| Inbox SaaS | [../whatsapp-platform/README.md](../whatsapp-platform/README.md) |
| Rotas hub | [../ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md](../ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md) |
| Setup API | [WHATSAPP-SETUP.md](./WHATSAPP-SETUP.md) |
