---
name: whatsapp-platform-safe-change
description: >-
  Alterações seguras em apps/whatsapp-platform: auth, billing, tenant,
  webhooks Meta, Cloud API e UI alinhada ao design system. Usar quando o
  utilizador pedir mudanças no produto WhatsApp Platform ou caminhos
  whatsapp-platform/**.
---

# WhatsApp Platform — mudança segura

Leia [`AGENTS.md`](../../AGENTS.md) e as regras `.cursor/rules/05-whatsapp-platform.mdc` e `whatsapp-platform-design.mdc`.

## Instruções

1. **Antes de editar**, inspeccionar serviços, route handlers, middleware e testes existentes no mesmo domínio (ex.: `src/modules/**`, `src/app/**`, `*.test.ts` vizinhos).
2. **Preservar**: fluxos de auth (Supabase/sessão do app), **billing** (Stripe, quotas, idempotência), **isolamento por tenant** em todas as queries e handlers, **audit logs** onde existirem, comportamento de **webhook** (GET verify + POST, retries Meta) e pressupostos da **WhatsApp Cloud API** já documentados em `apps/whatsapp-platform/docs/`.
3. **Prisma / schema** — não alterar salvo pedido explícito da tarefa; caso contrário limitar-se a chamadas e tipos já expostos.
4. **White-label / UX cliente** — não expor detalhes internos de billing, margens ou identificadores sensíveis em copy ou componentes voltados ao cliente final.
5. Quando a lógica mudar, **actualizar ou acrescentar testes directos** (Vitest) ao módulo afectado, não só snapshots frágeis.

## Expectativas de validação

- Correr testes directos ao pacote alterado; se tocar webhook ou billing, rever testes ou docs existentes que cubram idempotência/tenant.
- Smoke manual mínimo quando UI ou fluxos críticos mudarem (onboarding, inbox, billing).

## Não fazer

- Não relaxar verificações de tenant nem de assinatura de webhook “para facilitar”.
- Não logar tokens, corpo assinado de webhook ou PII desnecessária.
- Não misturar refactor grande com correção pontual no mesmo PR.
- Não alterar URLs canónicas de webhook/OAuth sem alinhar a `apps/whatsapp-platform/docs/DEPLOY_APP_SUBDOMAIN.md`.

## Princípios gerais

- **Diffs pequenos e revistos**; seguir padrões do ficheiro e do módulo.
- Para issues/labels relacionados, ver [`docs/operations/GITHUB_LABELS.md`](../../docs/operations/GITHUB_LABELS.md).
