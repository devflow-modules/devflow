/**
 * Expõe matchers do jest-dom no tipo `Assertion` do Vitest durante `pnpm exec tsc --noEmit`.
 * Caminho relativo ao pacote instalado nesta app (pnpm).
 */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- `import()` não mergeia matchers em `.d.ts` para `tsc` nos `*.test.tsx`
/// <reference path="../../node_modules/@testing-library/jest-dom/types/vitest.d.ts" />
