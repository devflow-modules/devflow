# ApplyFlow — pitch para entrevistas

Material para **entrevistas** e networking técnico. Valor do case: **arquitectura**, **ética de plataforma**, **failure modes** e **evidência** — não métricas de adopção inventadas.

Companion: [`APPLYFLOW_ENGINEERING_CASE.md`](./APPLYFLOW_ENGINEERING_CASE.md)

---

## Frase central

**EN:** *Local-first is a product and architecture decision, not a technical limitation.*
**PT:** *Local-first é uma decisão de produto e de arquitetura, não uma limitação técnica.*

---

## 30 segundos

> ApplyFlow is a local-first LinkedIn Easy Apply copiloto—Chrome extension plus Next.js dashboard—human-gated fills, no auto-submit. I also built a Persistence V2 pilot with account-scoped data, concurrency controls, and a resumable migration that keeps V1 authoritative until verified promotion. Engineering case ready; Production readiness not claimed.

---

## 90 segundos (PT-BR)

> O **ApplyFlow** (DevFlow Labs) ataca o Easy Apply repetitivo e o histórico disperso **sem** mass apply nem auto-submit.
> Produto default: **extensão Chrome MV3** + **dashboard Next.js**, dados no dispositivo, handoff por **JSON**.
> Em profundidade de engenharia: **Persistence V2** com Jobs/Applications por conta, **OCC** com `expectedVersion`, unicidade de `sourceJobId` **no PostgreSQL** sob corrida, e migração **partial-resumable**—staging pode existir, mas a autoridade canónica só muda após promote verificado.
> Boundaries: service worker dono da chave OpenAI; Nango Gmail/Calendar como identidade **browser-scoped** (pilot).
> Evidência em ADRs e Vitest (incl. races locais em Postgres). **Production readiness não é o claim.**

---

## 90 seconds (EN)

> **ApplyFlow** (DevFlow Labs) targets repetitive Easy Apply and scattered history **without** mass-apply or auto-submit.
> Default product: **Chrome MV3 extension** + **Next.js dashboard**, on-device data, **JSON** handoff.
> Engineering depth: **Persistence V2** with account-scoped Jobs/Applications, **OCC** via `expectedVersion`, PostgreSQL-enforced `sourceJobId` uniqueness under concurrency, and a **partial-resumable** migration—staging may exist, but canonical authority flips only after verified promotion.
> Boundaries: service worker owns the OpenAI key; Nango Gmail/Calendar is a **browser-scoped** pilot identity.
> Evidence in ADRs and Vitest (including local Postgres races). **Production readiness is not the claim.**

---

## 5 minutos — técnico (PT-BR)

1. **Produto:** extensão IIFE + SW; safety gate; core Zod partilhado; dashboard import/demo; CareerBundle → Interview Lab.
2. **Persistência:** V1 local-first default; V2 modes (`offering` / `active` / `read_only` / `paused`); account do session server-side.
3. **Concorrência:** unique partial index; conflitos tipados; OCC com `expectedVersion`.
4. **Migração:** sessão + fingerprint; crash deixa staging; retry converge; product GET bloqueado em offering; complete+promote atómico. **Não** all-or-nothing / exactly-once.
5. **Security boundaries:** content ≠ credential; LLM structured / sem tools no path verificado; erros de provider sanitizados; Nango caller ≠ ApplyFlow account.
6. **Limitações:** sem GC de staging; sem multi-device Gmail; sem claim multi-replica; Production backlog separado (incl. dependency hardening).

---

## 5 minutes — technical (EN)

Same outline as PT: product surfaces → V1 vs V2 → uniqueness + OCC → resumable migration semantics → AI/provider/extension boundaries → honest limitations.

---

## Perguntas prováveis

### Por que local-first?

> Domínio sensível (carreira, respostas, possível API key). Local-first reduz superfície e custo no produto default. Cloud existe como **pilot** com contratos explícitos—não como “já Production”.

### A cloud está implementada?

> **Sim, como Persistence V2 pilot** (auth, Postgres, migração, OCC). O **default do produto Easy Apply** continua local-first. Não reclamamos Production readiness.

### Como evita corridas em Applications?

> Invariante no **PostgreSQL** (índice único parcial), não só check-then-create na app. Validado localmente sob concorrência.

### Migração é all-or-nothing?

> **Não.** Staging parcial é permitido; autoridade canónica permanece V1 até promote verificado.

### E o Gmail?

> Pilot Nango com identidade **browser/device-scoped**. Logout ApplyFlow ≠ disconnect ≠ revoke Google. Outro browser = outra identidade.

---

## Material CV / recruiter

Ver secções no Engineering Case: recruiter summary + CV bullets.
