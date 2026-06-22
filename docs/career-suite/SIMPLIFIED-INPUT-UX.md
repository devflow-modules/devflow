# Career Suite Simplified Input UX

## Objective

Allow pilot participants to paste resume and job description as natural text before P01, while keeping existing analysis contracts unchanged.

## User problem

Participants had to structure inputs manually (`Resume bullets`, comma-separated skills, line-separated requirements, target roles). That friction is unrealistic for people who only have a PDF or a full job posting.

## Previous input model

The pilot workspace exposed `CareerSpecialistFields` directly:

- `resumeBullets` (one per line)
- `resumeSkills` (comma-separated)
- `jobRequirements` (one per line)
- `targetRoles` (comma-separated)
- `availability`

## New input model

Participants use `CareerPilotSimpleInputs`:

| Flow | Fields |
|------|--------|
| Analisar currículo | Cargo desejado (opcional), currículo em texto corrido |
| Comparar com vaga | Currículo, descrição da vaga |
| Plano de carreira | Objetivo profissional, tempo disponível, preferências/restrições |

## Deterministic normalization

`career-pilot-input-normalizer.ts` maps simple inputs to `CareerSpecialistFields`:

- `normalizeResumeText` / `normalizeJobDescription` — line breaks, empty lines, length limits
- `extractResumeLines` — bullets from lines or sentences (no invented content)
- `extractLikelySkills` — small catalog, case-insensitive, deduplicated
- `extractJobRequirements` — lines or sentences from job text
- `extractJobKeywords` — Unicode-safe tokenization (`/[^\p{L}\p{N}+#.]+/u`)
- `buildCareerSpecialistFieldsFromSimpleInputs` — bridge to existing pipeline

No external LLM. No summarization. No invented experiences.

## Optional review

Closed-by-default disclosure **Revisar informações extraídas** lets participants adjust:

- Experiências e resultados
- Principais competências
- Requisitos identificados
- Cargo desejado / tempo disponível

Edits update structured fields in memory only for the current request.

## Privacy

Copy near inputs: *O conteúdo é usado somente nesta análise e não é armazenado automaticamente.*

Data stays in React state for the open page and in the current `/career-chat/librechat` request. No localStorage, cookies, session backend, logs, analytics, or feedback payload.

## Non-goals

- No endpoint, schema, provider, OAuth, or persistence changes
- No external AI for parsing
- No Production promotion in this change

## Validation

- ApplyFlow unit/integration tests for normalizer, UI, contracts, privacy
- Local gates: test, build, lint, design-system, secrets

## Pilot impact

**Operational status:** `P01 SCHEDULING PAUSED — SIMPLIFIED INPUT UX IN PROGRESS`

P01 scheduling remains paused until Preview visual validation (desktop 1440×900, mobile 375×812) is completed on the feature branch PR.
