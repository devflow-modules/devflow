# Sprint: Onboarding + Billing Conversion (WhatsApp AI)

## Diagnóstico das telas atuais

### /settings/ai
- **Estado:** Form completo (toggle, prompt, model, sliders)
- **Problemas:** Sem contexto de onboarding; sem indicação de limite do plano; sem guia para novo usuário
- **Oportunidades:** Banner de estado (desativada/ativa/limite); CTA para analytics; guia passo a passo

### /settings/ai-analytics
- **Estado:** BUG — `usageStatus` e `planInfo` não são buscados (referências quebradas)
- **Problemas:** Card de limite não aparece; `getLimitInsight` não existe; runtime error
- **Oportunidades:** Corrigir fetch; barras de progresso; copy sobre "o que acontece ao exceder"

### /billing
- **Estado:** Funcional (subscription, usage, upgrade modal)
- **Problemas:** Não destaca valor da IA; limite de IA pouco visível; CTA genérico
- **Oportunidades:** Destaque "X respostas IA/mês"; copy de valor; CTA contextual

### Onboarding existente (OnboardingWizard)
- **Estado:** 3 passos — Conectar WA, Prompt base, API Key
- **Problemas:** Não inclui "ativar IA" nem "testar primeira mensagem"
- **Oportunidades:** Step opcional "Ativar IA"; link para testar no Inbox

---

## Plano de UX

1. **Estados da IA** (componente reutilizável)
   - `disabled` — IA desativada (toggle off)
   - `active` — IA ativa, dentro do limite
   - `near_limit` — ≥80% do limite
   - `exceeded` — Limite excedido, fallback ativo

2. **Componentes**
   - `AiStatusBanner` — banner contextual por estado
   - `AiUsageLimitCard` — usado/limite, barra, CTA
   - `AiOnboardingSteps` — checklist para novos usuários

3. **Fluxo de ativação** (na própria /settings/ai)
   - Conectar WhatsApp (link para settings)
   - Escolher motor (OpenAI/Claude)
   - Ativar IA (toggle)
   - Editar prompt
   - Testar (link para Inbox)

4. **Billing conversion**
   - Plano: destaque "X respostas IA/mês"
   - Estado limite: "Você usou Y de Z. Faça upgrade para mais."
   - Modal upgrade: benefício claro por plano

---

## Arquivos envolvidos

| Arquivo | Ação |
|---------|------|
| `AiAnalyticsClient.tsx` | Corrigir fetch usageStatus/planInfo; getLimitInsight |
| `AiSettingsForm.tsx` | Adicionar AiStatusBanner; contexto de limite |
| `settings/ai/page.tsx` | Checklist onboarding; links |
| `BillingPageClient.tsx` | Destaque IA; copy de valor; CTA |
| `components/ai/AiStatusBanner.tsx` | NOVO |
| `components/ai/AiUsageLimitCard.tsx` | NOVO (ou inline) |

---

## Checklist final

- [x] Corrigir AiAnalyticsClient (usageStatus, planInfo, getLimitInsight)
- [x] Criar AiStatusBanner (4 estados)
- [x] Integrar banner em /settings/ai
- [x] Guia de ativação em /settings/ai
- [x] Melhorar BillingPageClient (destaque IA, CTA, barra IA)
- [x] Copy "o que acontece ao exceder" em analytics
- [x] Testes (40 passando)
