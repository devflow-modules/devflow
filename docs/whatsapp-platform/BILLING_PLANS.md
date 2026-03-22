# Planos e Billing — WhatsApp Platform

Estrutura em duas camadas: **assinatura fixa mensal** + **uso variável** (excedente).

## Planos

| Plano | Preço | Números | Atendentes | Conversas/mês | Interações IA/mês |
|-------|-------|---------|------------|---------------|-------------------|
| **Starter** | R$ 39/mês | 1 | 1 | 1.000 | 100 |
| **Pro** | R$ 99/mês | 1 | 3 | 5.000 | 750 |
| **Scale** | R$ 249/mês | 3 | 10 | 20.000 | 3.000 |
| **Enterprise** | Sob consulta | Custom | Custom | Custom | Custom |

## Excedente (uso variável)

- **Conversa excedente**: R$ 0,03 por conversa
- **Interação IA excedente**: R$ 0,09 por interação

Configurável via env: `BILLING_PRICE_MESSAGE_BRL`, `BILLING_PRICE_AI_BRL`.

## Matriz de Feature Gating

| Feature | FREE | STARTER | PRO | SCALE |
|---------|------|---------|-----|-------|
| Inbox | ✓ | ✓ | ✓ | ✓ |
| Respostas automáticas básicas | ✓ | ✓ | ✓ | ✓ |
| Automação | | ✓ | ✓ | ✓ |
| Filas e tags | | | ✓ | ✓ |
| Automação avançada | | | ✓ | ✓ |
| Métricas básicas | | | ✓ | ✓ |
| IA avançada | | | | ✓ |
| Webhooks/API | | | | ✓ |
| Relatórios avançados | | | | ✓ |
| Suporte prioritário | | | | ✓ |
| Multi-usuário | | | ✓ | ✓ |

## Variáveis de ambiente (Stripe)

```env
WHATSAPP_STRIPE_PRICE_STARTER=price_xxx
WHATSAPP_STRIPE_PRICE_PRO=price_xxx
WHATSAPP_STRIPE_PRICE_SCALE=price_xxx

WHATSAPP_STRIPE_METERED_PRICE_MESSAGES=price_xxx
WHATSAPP_STRIPE_METERED_PRICE_AI=price_xxx
```

## Configuração no Stripe Dashboard

### Produtos

1. **WhatsApp Platform Starter** — price mensal R$ 39
2. **WhatsApp Platform Pro** — price mensal R$ 99
3. **WhatsApp Platform Scale** — price mensal R$ 249
4. **WhatsApp Platform Usage** — produto para itens metered

### Prices (usage-based)

- `messages_overage_brl` — R$ 0,03/unidade
- `ai_overage_brl` — R$ 0,09/unidade

### Customer Portal

- Trocar plano
- Cancelar assinatura
- Atualizar método de pagamento
- Ver histórico de invoices

### Trial

7 dias de trial no Starter e Pro (configurável no Stripe ao criar subscription).
