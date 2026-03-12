# Arquitetura — Separação DevFlow Site vs DevFlow WhatsApp Platform

Definição objetiva do que vive em cada repositório e fluxo de dados.

---

## Visão geral

| Repositório | Responsabilidade | Não deve ter |
|-------------|------------------|--------------|
| **devflow** (site) | Marketing, lead, demo, CTA | Webhook produção, motor do robô |
| **devflow-whatsapp-platform** | Backend do produto, Cloud API, operação | Landing pages, assets de marketing |

---

## DevFlow Site (devflowlabs.com.br)

### Responsabilidades

```
✓ Landing pages (home, automacao-whatsapp, chatbot-whatsapp, nichos)
✓ Blog
✓ Páginas legais (privacidade, termos, cookies)
✓ Demo pública (simulação)
✓ CTA "Falar no WhatsApp" → link wa.me
✓ Geração de lead (formulários, pixel, analytics)
✓ SEO
✓ Vitrine do produto
```

### O que o site NÃO deve ter em produção

```
✗ Webhook da Cloud API (caminho crítico de operação)
✗ Motor do robô
✗ Processamento de mensagens WhatsApp
✗ Lógica de handoff
✗ Multi-tenant
✗ Billing
```

### Configuração no site

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número que abre no wa.me ao clicar no CTA |
| `NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT` | Mensagem padrão pré-preenchida |

**Fluxo:** Visitante clica → abre WhatsApp com número + mensagem → conversa acontece no app do usuário.

---

## DevFlow WhatsApp Platform

### Responsabilidades

```
✓ Integração Meta Cloud API
✓ Webhook oficial (POST /webhook/whatsapp)
✓ Motor do robô (parser, fluxos, respostas)
✓ Tenants (clientes como Lemon, futuros)
✓ Handoff humano
✓ Métricas operacionais
✓ Dashboard / portal do cliente
✓ Billing
✓ Auditoria e logs
✓ Segurança (rate limit, validação)
```

### O que vive lá

```
src/
  modules/whatsapp/     ← migrar mensagens, parser, sendMessage
  webhooks/             ← endpoint Meta
  tenants/
  metrics/
  billing/
  ...
```

---

## Fluxo de dados

```
Visitante entra em devflowlabs.com.br
        ↓
Navega nas landing pages
        ↓
Clica em "Falar no WhatsApp"
        ↓
Abre wa.me/5513XXXXXXXX?text=...
        ↓
Mensagem cai no número oficial (WhatsApp Business)
        ↓
Meta envia webhook
        ↓
devflow-whatsapp-platform recebe e processa
        ↓
Robô responde (ou handoff)
```

**O site não participa do ciclo de mensagens.** Ele apenas direciona o lead para o WhatsApp.

---

## O que foi criado no site (estado atual)

| Item | Status | Ação recomendada |
|------|--------|------------------|
| `src/modules/whatsapp/` | PoC funcional | **Migrar** para devflow-whatsapp-platform |
| `src/app/api/webhook/whatsapp/` | Webhook testável | **Desativar** ou manter só para PoC local |
| `docs/WHATSAPP-SETUP.md` | Documentação | **Adaptar** para o projeto devflow-whatsapp-platform |
| Mensagens (boas-vindas, menu, opções) | Reutilizável | **Copiar** para a plataforma |

---

## Migração — O que levar para devflow-whatsapp-platform

### Conteúdo reutilizável

1. **Mensagens** — `messages.ts` (boas-vindas, menu, opções 1–3, demo, fallback)
2. **Parser** — `messageParser.ts` (lógica de intenção: oi, menu, 1, 2, 3)
3. **Fluxo inicial** — estrutura do `webhookHandler.ts`
4. **sendMessage** — chamada à Graph API (adaptar para auth/tenant)

### O que não migrar

- Route Handler Next.js (a plataforma já tem stack própria)
- Configuração de env do site (só `NEXT_PUBLIC_WHATSAPP_*`)

---

## Checklist pós-chip (ordem correta)

1. [ ] Ativar número no WhatsApp Business
2. [ ] Criar app no Meta Developers
3. [ ] Conectar número na Cloud API
4. [ ] **Plugar no devflow-whatsapp-platform** (não no site)
5. [ ] Configurar webhook na Meta apontando para a plataforma
6. [ ] No site, atualizar `NEXT_PUBLIC_WHATSAPP_NUMBER` com o número oficial
7. [ ] Testar: site → CTA → mensagem → plataforma processa

---

## URLs de referência

| Recurso | URL |
|---------|-----|
| Site | https://devflowlabs.com.br |
| Webhook (PoC, site) | https://devflowlabs.com.br/api/webhook/whatsapp |
| Webhook (produção) | Definido no devflow-whatsapp-platform |
| Demo | https://devflowlabs.com.br/demo |

---

## Resumo

- **Site = canal comercial.** Só leva o visitante até o WhatsApp.
- **Plataforma = operação.** Processa mensagens, robô, handoff, métricas.
- O que foi feito no site serve como **referência e protótipo**.
- A integração oficial vive no **devflow-whatsapp-platform**.
