# IA opt-in (Sprint 5) — ApplyFlow Extension

## Objetivo

Permitir **geração assistida** de textos longos (carta de apresentação, respostas abertas, mensagem a recrutador, resumo de fit, explicação de lacunas) usando um **modelo OpenAI** configurado pelo utilizador, **sem backend DevFlow**, **sem login** e **sempre com clique explícito** em «Gerar com IA».

## Arquitetura (AF-AI-001)

| Peça | Local |
|------|--------|
| Definições públicas (`enabled`, `model`, `keyConfigured`, …) | `chrome.storage.local` → `APPLYFLOW_SETTINGS_V1` |
| Credencial OpenAI (`apiKey`) | `chrome.storage.local` → `APPLYFLOW_AI_CREDENTIAL_V1` (**só** service worker / opções) — **não cifrado em repouso** |
| Leitura pública (content / painel) | `getApplyFlowPublicSettings()` em `applyflow-storage-public.ts` |
| Leitura privada (service worker / opções) | `getApplyFlowPrivateSettings()` |
| Mensagem de capacidade | `applyflow:generate-ai` (content → service worker) |
| Cliente HTTP OpenAI | `openai-client.ts` — só no **service worker** (`https://api.openai.com/v1/chat/completions` fixo) |
| Orquestração + auditoria | `generate-ai-text.ts` (SW) + `APPLYFLOW_AI_AUDIT_V1` |
| UI opções | `AiSettingsPanel` — estado `keyConfigured`; não reapresenta a chave após gravar |
| UI painel | `AiSuggestionBox` via `PanelAiBundle.runTask` → `requestGenerateAi` |

Fluxo:

```
content script / panel
  → typed GENERATE_AI (sem credenciais)
  → MV3 service worker
  → carrega chave privada do storage
  → OpenAI (endpoint allowlisted)
  → texto seguro / erro estável
  → content script
```

**Invariante:** o content script e o page world **nunca** recebem a API key em claro.

Afirmação correcta após remediação: *«A chave OpenAI do utilizador está isolada dos caminhos de execução de IA do content script ApplyFlow.»*

Não afirmar: cifragem de `chrome.storage.local`, impossibilidade absoluta de roubo, ou protecção contra outras extensões.

## Privacidade

- A **API key** não é logada, não vai para export de perfil/histórico e no export de definições «seguro» aparece mascarada (`***`).
- **Texto gerado** e **prompt completo** **não** são persistidos em `chrome.storage`.
- O pedido à OpenAI inclui **excerts** do perfil (serializado para o prompt **sem** bloco salarial) e **excerto limitado** do texto da vaga quando disponível no painel — não armazenamos o texto integral da página em storage neste fluxo.
- ApplyFlow **não envia candidatura**, **não** avança passos nem clica em Submit/Next.

## Tarefas suportadas (`AiTextTask`)

- `cover_letter` — carta 3–5 parágrafos curtos
- `open_answer` — resposta a pergunta aberta / textarea / classificação desconhecida relevante
- `recruiter_message` — nota curta ao recrutador
- `fit_summary` — bullets de alinhamento (só no cartão Fit; copiar/limpar, sem preencher campo)
- `gap_explanation` — lacunas / transição (rótulos com palavras‑chave configuradas no inferidor)

A inferência do tipo por campo está em `infer-panel-ai-task.ts` (exclui salário, localização, sim/não, anos, etc.).

## Regras anti-alucinação (prompts)

- Não inventar experiência, empregadores ou anos em tecnologias.
- Skills com **0** anos: não afirmar domínio; usar linguagem honesta (familiaridade, exposição, aprendizado rápido).
- Priorizar tecnologias e papéis realmente declarados no perfil.

## Auditoria

Cada tentativa de geração regista apenas metadados, por exemplo:

```json
{
  "timestamp": "…",
  "task": "cover_letter",
  "result": "success",
  "generatedLength": 842
}
```

Ou `result: "failed"` com `reason` curto. **Não** há `prompt`, `output` nem `apiKey`.

## Checklist manual

1. Com IA **desactivada** ou **sem chave**, o painel mostra estado informativo (sem chamadas à API).
2. Activar IA, guardar chave, abrir modal Easy Apply → «Gerar com IA» só após clique.
3. Verificar que **Preencher** com texto IA ainda exige confirmação de segurança quando aplicável (baixa confiança / unknown).
4. Confirmar que o **histórico de candidaturas** e exports de perfil **não** contêm o texto gerado nem a chave.
5. Opcional: inspeccionar `APPLYFLOW_AI_AUDIT_V1` no DevTools da extensão.
6. Confirmar que DevTools do content script / `getApplyFlowPublicSettings` **não** expõe `apiKey`.

## Limitações

- Dependência da disponibilidade e **custos** da OpenAI.
- Qualidade varia com modelo e contexto; o utilizador deve rever sempre o texto antes de enviar no LinkedIn.
- Não substitui leitura da política de privacidade da OpenAI nem revisão humana das candidaturas.
- `chrome.storage.local` **não** é cifrado em repouso pelo browser.
