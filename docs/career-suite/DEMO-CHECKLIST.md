# Career Suite — Demo checklist

Checklist for a repeatable **60–90 second** portfolio demo (ApplyFlow → Interview Lab → Resume Match). Use a clean browser profile or incognito.

**Full product narrative:** [`README.md`](./README.md) · **Resume Match case study:** [`RESUME-MATCH-CASE-STUDY.md`](./RESUME-MATCH-CASE-STUDY.md)

---

## Prerequisites

- Node 22+, pnpm (monorepo root)
- Ports **3010** (ApplyFlow) and **3015** (Interview Lab) free
- Optional: Chrome with ApplyFlow extension for real LinkedIn history (not required — demo JSON works)
- Optional OpenAI key in Interview Lab **`/ai-review`** only if demoing **AI coaching** (never required for core flow)

### Environment variables (local demo)

Set in `apps/applyflow/.env.local` and/or `apps/interview-lab/.env.local` (never commit values):

| Variable | App | Purpose |
|----------|-----|---------|
| `NEXT_PUBLIC_INTERVIEW_LAB_URL` | ApplyFlow | Target for handoff (default `http://localhost:3015`) |
| `NEXT_PUBLIC_APPLYFLOW_URL` | Interview Lab | Allowed postMessage origin in non-localhost deploys (default localhost + `127.0.0.1:3010`) |

No backend, database, or API keys required for the deterministic path.

---

## Build shared packages (once per session)

From monorepo root:

```bash
pnpm --filter @devflow/applyflow-core build
pnpm --filter @devflow/career-core build
```

---

## Start ApplyFlow

```bash
pnpm --filter applyflow dev
```

Open **http://localhost:3010/dashboard** → click **Carregar demo** (or import extension JSON).

---

## Start Interview Lab (second terminal)

```bash
pnpm --filter @devflow/app-interview-lab dev
```

Open **http://localhost:3015/import/applyflow** when testing manual import.

---

## Test handoff: postMessage (one-click)

1. ApplyFlow dashboard → **Interview Lab · exportação local**
2. Click **Prepare in Interview Lab**
3. **Expected:** new tab opens with `?handoff=postMessage`; bundle imports automatically; ApplyFlow shows **CareerBundle sent to Interview Lab**
4. **If clipboard fallback:** message explains timeout/popup — use **Import from clipboard** in Interview Lab (JSON already copied)

### Practice this role (direct)

1. In applications table → **Practice this role** on a row
2. **Expected:** Interview Lab opens with `?intent=practice`; redirects to `/practice/...?careerPrep=` when handoff succeeds

---

## Test fallback: clipboard

1. ApplyFlow → **Copy CareerBundle**
2. Interview Lab → **Open Interview Lab** (or navigate to `/import/applyflow?from=applyflow`)
3. Click **Import from clipboard**
4. **Expected:** bundle summary + application list; no server calls

---

## Test fallback: file upload / paste

1. ApplyFlow → **Exportar para Interview Lab** (download `.json`)
2. Interview Lab → upload file **or** paste JSON → **Parse field**
3. **Invalid JSON:** specific Zod/parse error (not generic “Invalid file”)
4. **Valid bundle:** same summary as clipboard path

---

## Test Resume Match (`/career/ats`)

1. Open **http://localhost:3015/career/ats**
2. **Load sample analysis** → **Analyze ATS match**
3. **Expected:** scores, keywords, gaps, questions — **no network** for core analysis
4. **Practice interview from this analysis** → practice room with prep panel (`?careerPrep=`)
5. **Optional:** configure key on `/ai-review` → **Generate AI coaching** (explicit click only)

---

## Screenshots to capture (portfolio)

- [ ] ApplyFlow dashboard with demo data + export card
- [ ] **Prepare in Interview Lab** success state (ACK message)
- [ ] Interview Lab import with **Bundle summary**
- [ ] Application list + **Train for this role**
- [ ] Practice session with **ApplyFlow · interview prep** panel
- [ ] `/career/ats` with sample scores
- [ ] (Optional) AI coaching panel after explicit generate

---

## 60–90s recording script

| Time | Action | Say (short) |
|------|--------|-------------|
| 0–15s | ApplyFlow dashboard + demo load | “Local-first job funnel — no backend.” |
| 15–35s | **Prepare in Interview Lab** | “Typed CareerBundle over postMessage — validated in both apps.” |
| 35–50s | Pick role → **Train** or show prep panel | “Deterministic interview prep from role + skills.” |
| 50–70s | `/career/ats` → analyze → practice | “Resume match runs in the browser; AI is opt-in.” |
| 70–90s | Close on privacy one-liner | “Sensitive data stays in the browser until you choose otherwise.” |

---

## Tests before publishing (LinkedIn / GitHub)

```bash
pnpm --filter @devflow/career-core test
pnpm --filter applyflow test
pnpm --filter @devflow/app-interview-lab test
```

All should pass. Re-run handoff smoke once after doc changes.

---

## Pre-publish checklist

- [ ] Demo works on fresh profile without extension
- [ ] No real resume/PII in screenshots
- [ ] No API keys visible in screen recording
- [ ] README + case study links work on GitHub
- [ ] Commit scope is Career Suite only (no unrelated monorepo noise)

---

## Known limitations (call out in posts)

- postMessage requires compatible origins (`localhost` vs `127.0.0.1` — use env vars in staging)
- ApplyFlow does not export full job descriptions yet (skills + metadata only)
- AI coaching uses browser-stored OpenAI key (MVP pattern, not production billing)
- No cloud sync — explicit JSON handoff by design
