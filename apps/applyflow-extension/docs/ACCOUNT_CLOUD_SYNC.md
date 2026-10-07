# Extensão ApplyFlow — sincronização com a conta (V2)

Comportamento **implementado** quando a extensão está ligada com grant opaco. Sem grant, o modo local (`chrome.storage.local`) permanece como autoridade do browser.

## Matriz de operações

| Operação | Endpoint | Autenticação | Dados | Falha |
| --- | --- | --- | --- | --- |
| Estado da conta | `GET /api/applyflow/v2/extension/session` | Bearer grant | `{ signedIn, accountId, email?, expiresAt }` — **sem** token | 401 → limpa session storage + UI de reconexão |
| Carregar currículo | `GET /api/applyflow/v2/profile` | Bearer → conta no servidor | `ResumeLibrary` + `version` | 401 revoga local; 403/503 modos read-only/paused; `profile_empty` se sem variantes |
| Selecionar variante | (local no SW) | — | `preferredVariantId` + default da biblioteca | Sem fallback para perfil legado |
| Assistência (painel) | mensagem SW → content | sender.id / origem confiável | Só `CandidateProfile` da variante (não a biblioteca completa) | Sem grant → perfil local / demo |
| Registar preparação | `POST /api/applyflow/v2/jobs` + `POST …/applications` | Bearer | ids estáveis `extjob_*` / `extapp_*` por `accountId+jobUrl` | ver tabela 409 abaixo |
| Marcar enviada | `POST …/applications/:id/lifecycle` | Bearer + `expectedVersion` | `status: applied` só com confirmação explícita de envio externo | `version_conflict` / `conflict_unknown`; 401; sem auto-submit |
| Logout / revogação | dashboard revoga grants | — | SW descarta token, cache e requests in-flight (generation fence) | Operações seguintes falham até novo mint |

**Não sincronizado pela extensão:** contatos, respostas inbound, importação de legado local → conta.

## Tratamento HTTP 409 (cliente da extensão)

| Código `error` | Comportamento |
| --- | --- |
| `job_already_exists` | `GET /jobs/:stableId` autenticado; reutiliza só se id+URL compatíveis; senão `conflict_incompatible` |
| `application_already_exists` | `GET /applications/:stableId`; confere `sourceJobId` + URL; senão incompatível |
| `application_already_exists_for_job` | GET por id estável; se 404, lista e casa por `sourceJobId`/URL com as mesmas checagens |
| `version_conflict` | **Falha explícita** — não é reuse; UI pede reload/revisão; versão no servidor prevalece |
| Outro 409 | `conflict_unknown` — falha explícita, nunca sucesso |
| Rede após POST (possível commit) | Reconcilia por ids estáveis via GET **antes** de repetir create; se não existir, devolve `network` (sem retry cego) |

## Isolamento

- Token só em `chrome.storage.session` (contextos confiáveis da extensão).
- Content scripts nunca recebem Bearer.
- `accountId` em mensagens/body **não** autoriza dados — o servidor deriva a conta do grant.
- Troca de conta / logout: `generation` incrementa, `AbortController` cancela fetches, snapshot anterior é descartado.

## Fixture local de assistência

Build **local** injecta content script em `{origin}/extension-fixture*` (3010/3012). Página: `/extension-fixture` no dashboard. Produção: só LinkedIn.

## Contrato A (runtime)

Isolamento por conta é garantido na **API** (queries com `accountId` do grant/sessão). A role Prisma local `applyflow_runtime` é `NOSUPERUSER` + `BYPASSRLS` — RLS não é o controlo efectivo para o runtime. Ver `docs/applyflow/ACCOUNT_PERSISTENCE_PUBLICATION_PREP.md`.
