# Vercel Build — Ajustes de Compatibilidade

## Problema

Na Vercel, o `@prisma/client` pode resolver para tipos genéricos que **não incluem** os delegates dos models (ex: `whatsappConversation`, `whatsappOnboardingState`). Isso gera erros de TypeScript como:

```
Property 'whatsappConversation' does not exist on type 'PrismaClient<...>'
```

## Solução implementada

### 1. Prisma root (schema principal do portal)

- **`src/lib/prisma-root.ts`**: exporta `prisma` tipado como `PrismaRoot` (`any`) para o schema raiz do monorepo (Financeiro legado na raiz, revenue, etc.).
- Todos os consumidores desse client no **portal** importam de `@/lib/prisma-root`.
- **Importar sempre de** `@/lib/prisma-root`, nunca de `@prisma/client` para o client de runtime do schema raiz.
- O produto **Financeiro** canónico usa o Prisma gerado em **`apps/financeiro`** (`@/modules/financeiro/lib/db` dentro desse app).

### 2. Enums do schema root

- Evitar imports de enums de `@prisma/client` quando possível; definir localmente se necessário.

### 3. Prisma.InputJsonValue

- Importar apenas `Prisma` de `@prisma/client` para `InputJsonValue`.
- Esse import costuma funcionar na Vercel.

### 4. Client WhatsApp (schema separado)

- **`@/generated/prisma-whatsapp`** (gerado no build de **`apps/whatsapp-platform`**): o portal na raiz **não** gera mais esse client.
- No monorepo, o schema WhatsApp vive no app; ver `apps/whatsapp-platform/prisma/schema.prisma`.

## Checklist para novos arquivos

- [ ] Usar `prisma` de `@/lib/prisma-root` para o schema raiz no portal.
- [ ] Evitar importar enums de `@prisma/client`; definir localmente se necessário.
- [ ] Usar `PrismaRoot` para parâmetros de funções que recebem o client root.
- [ ] Rodar `pnpm run build` localmente antes do deploy.
