# Vercel Build — Ajustes de Compatibilidade

## Problema

Na Vercel, o `@prisma/client` pode resolver para tipos genéricos que **não incluem** os delegates dos models (ex: `whatsappConversation`, `whatsappOnboardingState`). Isso gera erros de TypeScript como:

```
Property 'whatsappConversation' does not exist on type 'PrismaClient<...>'
```

## Solução implementada

### 1. Prisma root (schema principal)

- **`src/modules/financeiro/lib/db.ts`**: exporta `prisma` tipado como `PrismaRoot` (`any`) e reexporta o tipo.
- Todos os consumidores de `prisma` (whatsapp-inbox, whatsapp-onboarding, etc.) passam a usar esse client tipado de forma permissiva.
- **Importar sempre de** `@/modules/financeiro/lib/db`, nunca de `@prisma/client` para o client de runtime.

### 2. Enums do schema root

- Evitar imports de enums de `@prisma/client` quando possível.
- **`whatsappInbox.message.service.ts`**: enums definidos localmente (`WhatsappInboxDeliveryStatus`, `WhatsappInboxDirection`, `WhatsappInboxMessageType`).

### 3. Prisma.InputJsonValue

- Importar apenas `Prisma` de `@prisma/client` para `InputJsonValue`.
- Esse import costuma funcionar na Vercel.

### 4. Client WhatsApp (schema separado)

- **`@/generated/prisma-whatsapp`** e **`@/lib/prisma-whatsapp`**: usados pelo `whatsapp-platform`.
- Esse client tem schema próprio e não apresenta o mesmo problema de tipagem na Vercel.

## Checklist para novos arquivos

- [ ] Usar `prisma` de `@/modules/financeiro/lib/db` para o schema root.
- [ ] Evitar importar enums de `@prisma/client`; definir localmente se necessário.
- [ ] Usar `PrismaRoot` para parâmetros de funções que recebem o client root.
- [ ] Rodar `pnpm run build` localmente antes do deploy.
