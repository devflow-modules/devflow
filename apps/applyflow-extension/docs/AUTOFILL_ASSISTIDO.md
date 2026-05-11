# ApplyFlow — Autofill assistido + Sprint 3.1

Documentação técnica e de produto do autofill e da camada de segurança/auditoria.

## Estado pós-Sprint 3 e 3.1

### Entregues

| Área | Descrição |
|------|-----------|
| Autofill por campo | `linkedin-field-autofill`, `apply-field-value`, resolver DOM, highlight |
| **Safety gate (3.1)** | `canAutofillField` em `src/content/autofill/autofill-safety.ts` — veta vazio, `unknown` sem aceite manual, baixa confiança sem aceite, e tipos DOM proibidos (submit/button/…) após resolver |
| **UX confirmação** | Cartão mostra mensagem explícita; **Confirmar preenchimento** para `low`/unknown antes de aplicar DOM |
| **Auditoria local** | `APPLYFLOW_AUTOFILL_AUDIT_V1`, max 100 eventos — sem valores preenchidos, sem texto completo da vaga, sem etiqueta inteira (`autofill-audit-storage.ts`) |
| **Sessão em painel** | Contadores só em memória na aba; **Limpar sessão** não toca na auditoria |
| **Debug** | `applyflow-debug.ts`: gate, entrada de auditoria (metadados), contadores da sessão — sem `suggestedValue` em log |

### O pacote `@devflow/applyflow-linkedin`

Continua só com parsing/classificação pura sobre HTML de testes e `normalizeLinkedInLabel`; heuristicas novas DOM específicas da extensão permanecem sob `apps/applyflow-extension/src/content/autofill/`.

## Regras de produto (inalteradas)

- Sem Submit / Next automatizados pela extensão.
- Sem backend, IA remota nem base de dados.
- Sem valores de sugestão persistidos nem texto integral da página da vaga na auditoria.
- Um clique único só preenche **um** campo (após eventual confirmação de risco).

## Safety gate — resumo de regras

1. `suggestedValue` em branco → bloqueado, sem segundo passo possível pelo gate.
2. `classificationType` base `unknown` → bloqueado até `requiresConfirmation` (equivale ao estado “confirmado pelo utilizador” no cartão).
3. `suggestionConfidence === low` OU `fieldConfidence === low` (quando especificado) → idem até confirmação.
4. `high`/`medium` (e `low` após confirmação) prosseguem.
5. Pós-resolve: `controlType` que caia nos vetos *(submit/button/hidden/next-semantic)* → falha antes de gravar valores.

## Auditoria — formato conceptual

Por evento guardado pode existir:

- `id`, `timestamp` ISO
- **`jobTitle?`**, **`companyName?`** (do `JobContext` já calculado pela extensão — não inclui HTML completo)
- **`fieldType`**: resultado da resolução DOM (`number`, `textarea`, `radio-group`, etc.) ou `unresolved`
- **`classificationType`**, **`confidence`** (`high`|`medium`|`low` da camada da sugestão)
- **`result`**: `success` | `failed` | `blocked`
- **`reason?`**: até ~240 caracteres, para diagnóstico local apenas

### Limitações remanescentes

- Matching `select`/editores especializados ainda pode falhar mesmo com segurança e confirmação — **Copiar** continua canónico.
- Auditoria **não substitui** revisão visual humana antes de enviar candidatura.
- Limpar dados da extensão apaga também perfil/permissões configuradas pelo utilizador; preferir apenas `chrome.storage.local.remove('APPLYFLOW_AUTOFILL_AUDIT_V1')` se só quiser anular auditoria sem apagar perfil (**requer método manual no DevTools/extension context até haver página de preferências específica**).

---

*DevFlow Labs — ApplyFlow.*
