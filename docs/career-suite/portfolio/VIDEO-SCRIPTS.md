# Career Suite — Video scripts

**Status:** scripts only — **no video file** in the repository.  
**Base walkthrough:** [../demo/CAREER-SUITE-WALKTHROUGH.md](../demo/CAREER-SUITE-WALKTHROUGH.md) · **Demo script:** [../../public-cases/CAREER-SUITE-DEMO-SCRIPT.md](../../public-cases/CAREER-SUITE-DEMO-SCRIPT.md)

**Setup:** ApplyFlow `:3010` · Interview Lab `:3015` · **Carregar demo** only · popups allowed.

---

## 60 seconds

| Sec | Screen | Action | Narration (PT) |
|-----|--------|--------|----------------|
| 0–8 | ApplyFlow `/dashboard` | **Carregar demo** | “ApplyFlow mantém candidaturas no dispositivo — funil local, sem upload obrigatório.” |
| 8–18 | Dashboard metrics | Scroll funnel/table | “Dados fictícios para demo — o mesmo modelo serve import da extensão.” |
| 18–28 | Export card | **Prepare in Interview Lab** | “Um clique envia o CareerBundle tipado — postMessage com ACK.” |
| 28–38 | Interview Lab import | Show “CareerBundle received” | “Interview Lab valida o mesmo schema Zod — import confirmado no browser.” |
| 38–50 | `/career/ats` | Load sample → **Analyze ATS match** | “Resume Match determinístico — gaps antes de qualquer IA opcional.” |
| 50–60 | Case doc or split view | — | “Read-only lifecycle; apply e import explicitamente deferred. Case completo no repositório.” |

**Main message:** Local-first handoff between apps — explicit, typed, human-reviewed.

---

## 90 seconds

Includes 60s script, plus:

| Sec | Screen | Action | Narration (PT) |
|-----|--------|--------|----------------|
| 60–72 | Export card | Enable **Demo sync enrichment**; show **Demonstrativo** badge | “Origem da composição visível antes do export — sandbox, sem OAuth.” |
| 72–82 | Export card | Highlight **Exportar para Interview Lab** | “Alternativa explícita: JSON local — utilizador controla o artefacto.” |
| 82–90 | Architecture (case §6) | Scroll trust boundaries | “Provider raw não chega à UI; 1.045 testes Vitest no escopo Career Suite.” |

**Main message:** Product + engineering — privacy boundaries, auditable composition, tested contracts.

---

## 3 minutes

### Act 1 — Problem (0:00–0:25)

| Screen | Action | Narration |
|--------|--------|-----------|
| ApplyFlow landing or case §2 | Static or slow scroll | “Candidaturas dispersas, preparação genérica, automação opaca. A pergunta foi: como ligar aplicações à prática por vaga, com o utilizador no controlo?” |

### Act 2 — ApplyFlow (0:25–1:05)

| Screen | Action | Narration |
|--------|--------|-----------|
| Dashboard | **Carregar demo** | “ApplyFlow: dashboard Next.js, extensão MV3, histórico local.” |
| Table + metrics | Filter one row | “Funil e métricas sem PII — demo pública.” |
| Provider consent preview | Scroll boundaries | “Integração provider é consent-based; corpos de email e tokens nunca armazenados no cliente.” |

### Act 3 — Composition + handoff (1:05–1:50)

| Screen | Action | Narration |
|--------|--------|-----------|
| Export card | Demo sync enrichment ON | “Checkbox opt-in adiciona sinais sandbox ao bundle — read-only no Interview Lab.” |
| Export card | **Prepare in Interview Lab** | “Handoff postMessage — sem bundle na URL.” |
| Interview Lab | ACK + bundle summary | “Validação, resumo, preview de sync enrichment não persistido.” |

### Act 4 — Interview Lab depth (1:50–2:30)

| Screen | Action | Narration |
|--------|--------|-----------|
| `/career/ats` | ATS match | “Análise determinística no browser.” |
| Practice (optional) | **Train for this role** | “Prep gerado a partir dos campos da candidatura — não um chat genérico.” |

### Act 5 — Engineering close (2:30–3:00)

| Screen | Action | Narration |
|--------|--------|-----------|
| Case §9 or ADR list | Scroll | “Lifecycle read-only até export. ADR-003: apply deferred. ADR-002: import deferred.” |
| Case §12 | Test table | “Mil e quarenta e cinco testes Vitest — contratos, handoff, change preview VMs.” |
| CTA | — | “Case e screenshots no GitHub — link na descrição.” |

**Main message:** Modular career tooling with engineering governance — not autonomous job application.

---

## Recording checklist

- [ ] 1440×900 or 1920×1080, zoom 100%
- [ ] Demo data only
- [ ] ACK visible or clipboard fallback explained on camera
- [ ] Do not show `.env` or API keys
- [ ] Do not claim video already exists when publishing links
- [ ] Optional end card: hero `01-applyflow-dashboard.png`
