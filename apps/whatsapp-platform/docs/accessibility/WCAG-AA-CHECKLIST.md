# Checklist manual — WCAG 2.1 AA (fluxos críticos)

Objetivo: complementar `pnpm test:a11y` (axe + Playwright) com verificação humana de teclado, foco e comportamento.

**Como usar:** percorrer cada secção nos ambientes relevantes (local/staging). Marcar `[x]` quando validado; anotar data e versão na última revisão.

**Última revisão:** _YYYY-MM-DD — commit / versão_

---

## 1. Navegação por teclado

- [ ] Em `/login`, percorrer todos os controlos com **Tab** / **Shift+Tab** sem ficar preso em ciclo não intencional.
- [ ] Em `/inbox` (shell), **Tab** alcança lista, compositor, rail e botões de ação principais.
- [ ] Em `/settings/ai`, secções e formulários acessíveis por teclado.
- [ ] Em `/admin/whatsapp`, tabelas/cartões e ações principais acessíveis por teclado (conta `platform_admin`).

---

## 2. Foco visível

- [ ] Cada elemento focável mostra **indicador de foco** perceptível (anel/outline), incluindo botões ghost/ícone.
- [ ] Após fechar modal, o foco regressa de forma previsível (ideal: elemento que abriu o modal).

---

## 3. Modais críticos (ex.: suporte)

- [ ] Ao abrir **Precisa de ajuda?**, o foco move para o diálogo (`role="dialog"`, `aria-modal="true"`).
- [ ] **Escape** fecha o modal (comportamento actual do `SupportModal`).
- [ ] **Tab** mantém foco dentro do modal (ciclo de foco); se não houver trap explícito, validar se não “fuga” de forma crítica para conteúdo de fundo.

---

## 4. Formulários

- [ ] Todos os **inputs** têm **label** visível ou `sr-only` + `htmlFor`/`id` correctos.
- [ ] **Mensagens de erro** (`role="alert"` ou `aria-live`) estão associadas ao fluxo perceptível (utilizador percebe o erro sem só cor).

---

## 5. Landmarks e estrutura

- [ ] Página tem **landmarks** úteis (`main`, `nav`, `header` onde aplicável) — sem duplicar `main` de forma incorrecta.
- [ ] **Título** (`<title>` / metadata) distinto por rota (ex.: login vs inbox).

---

## 6. Movimento reduzido

- [ ] Com `prefers-reduced-motion: reduce` no DevTools, animações decorativas não impedem uso (ou são reduzidas).

---

## 7. Contraste visual

- [ ] Texto principal e controlos sobre fundos escuros/claros cumprem **AA** em revisão visual (o axe cobre muitas combinações; excepções abaixo).

---

## 8. Automatização (referência)

| Comando | Descrição |
|---------|-----------|
| `pnpm test:a11y` | Playwright + `@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21aa`. **Falha** em violações **critical** / **serious**; **moderate** e inferiores são logados como aviso no stdout. |
| `pnpm test:a11y:product-ui` | Subconjunto Product UI (superfícies P0/P1). |
| `pnpm exec playwright test tests/a11y/critical-flows.spec.ts` | Fluxos críticos base (login, inbox, modal suporte, etc.). |

### Credenciais e sessão autenticada (P2.1)

| Variável | Uso |
|----------|-----|
| `E2E_WHATSAPP_ADMIN_EMAIL` | Login Playwright — tenant manager recomendado |
| `E2E_WHATSAPP_ADMIN_PASSWORD` | Login Playwright — **nunca commitar** |
| `E2E_WHATSAPP_BASE_URL` | Staging/CI (opcional); local omite → `http://127.0.0.1:3099` |
| `E2E_BASE_URL` | Alias legado |

**Sem credenciais:** testes autenticados são **skipped**; `/login` em `critical-flows` continua a correr.

**Com credenciais:** `globalSetup` faz login uma vez → `tests/.auth/whatsapp-admin.json` (gitignored) → specs reutilizam `storageState`.

**CI:** GitHub Actions `WhatsApp Platform A11y` — secrets `E2E_WHATSAPP_ADMIN_EMAIL`, `E2E_WHATSAPP_ADMIN_PASSWORD`, opcional `E2E_WHATSAPP_BASE_URL` para staging (sem webServer local).

**Local:** definir variáveis em `.env.local` (app ou raiz do monorepo); ver `.env.example`.

---

## 9. Excepções documentadas

| Tema | Motivo | Acção |
|------|--------|--------|
| `/billing` no teste axe | `NEXT_PUBLIC_PRODUCT_MODE` ≠ `SAAS` oculta billing (middleware). | Teste skipped; validar manualmente em modo SAAS ou aceitar N/A. |
| `/admin/whatsapp` | Utilizador E2E pode não ser `platform_admin`. | Teste skipped; usar conta interna ou preencher checklist manual em staging. |
| `color-contrast` (axe) | Alguns fundos com variáveis CSS podem divergir do valor computado em edge cases. | Revalidar visualmente; corrigir tokens se reproduzir em browser real. |

---

## 10. Histórico de correções (axe)

| Data | Ficheiro / área | Problema | Correcção |
|------|-----------------|----------|-----------|
| _preencher_ | `PasswordField` — botão Mostrar/Ocultar | `color-contrast` serious (azul Tailwind sobre fundo escuro); `tabIndex={-1}` prejudicava teclado. | Tokens `--df-brand-*`, foco visível, `aria-pressed`; removido `tabIndex={-1}`. |
