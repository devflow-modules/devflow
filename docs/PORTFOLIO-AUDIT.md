# Portfolio Audit Checklist

This checklist is used to make DevFlow Labs and Gustavo Marques' portfolio easier to evaluate by recruiters, hiring managers and technical reviewers.

## Review Criteria

Each priority project should be understandable in under two minutes and should clearly show product value, technical depth and engineering maturity.

## P0 — Recruiter First Impression

- [ ] The repository has a clear one-line value proposition.
- [ ] The README is written in English.
- [ ] The first screen explains what the project is.
- [ ] The project has a visible live/demo link when applicable.
- [ ] The README shows the main stack near the top.
- [ ] The README explains the business problem.
- [ ] The README explains the solution.
- [ ] The README highlights the strongest technical decisions.
- [ ] The README links to screenshots or demo assets.
- [ ] The README has setup instructions.
- [ ] The README explains how to run tests.
- [ ] The README has an author/contact section.

## P1 — Technical Maturity

- [ ] Architecture is documented.
- [ ] Security model is documented.
- [ ] Testing strategy is documented.
- [ ] Environment variables are documented.
- [ ] `.env.example` exists where needed.
- [ ] CI is visible through GitHub Actions or badges.
- [ ] Lint/build/test commands are documented.
- [ ] External integrations are explained.
- [ ] Data model or persistence strategy is described.
- [ ] Error handling strategy is described.
- [ ] Roadmap is realistic and not overpromising.

## P2 — Product Maturity

- [ ] The README explains the target user.
- [ ] The README explains business impact.
- [ ] The README explains why the project matters.
- [ ] The README distinguishes MVP, demo and production status.
- [ ] The README avoids vague claims without evidence.
- [ ] Screenshots show real product states or realistic demo states.
- [ ] There is a short recruiter note or review path.
- [ ] Documentation avoids exposing secrets, private client data or sensitive implementation details.

## P3 — GitHub Presence

- [ ] The GitHub profile README highlights only the strongest projects.
- [ ] Pinned repositories reflect the current positioning.
- [ ] Old learning repositories are not competing with current flagship products.
- [ ] The DevFlow Labs organization profile explains the product ecosystem.
- [ ] Project names, descriptions and topics are consistent.
- [ ] Repository descriptions are short and recruiter-friendly.

## Priority Repositories

### 1. DevFlow WhatsApp Platform

Focus:

- Multi-tenant backend architecture
- WhatsApp Cloud API integration
- Security model
- Metrics and operational readiness
- Tests and CI

Checklist:

- [ ] README includes Business Impact.
- [ ] README includes Security Highlights near the top.
- [ ] README includes Architecture Overview.
- [ ] Add `docs/SECURITY-MODEL.md`.
- [ ] Add `docs/ARCHITECTURE.md`.
- [ ] Add `docs/TESTING.md`.
- [ ] Add screenshots or dashboard preview.
- [ ] Confirm tests/build pass locally.

### 2. Investiga+

Focus:

- Production-oriented SaaS
- CNPJ/company intelligence
- JWT + HttpOnly Cookies
- API integration and cache
- History and user-scoped data

Checklist:

- [ ] README includes Business Impact.
- [ ] README includes Security Highlights.
- [ ] README includes Testing Strategy.
- [ ] Add `docs/ARCHITECTURE.md`.
- [ ] Add `docs/SECURITY.md`.
- [ ] Add `docs/TESTING.md`.
- [ ] Add screenshots for login, dashboard, CNPJ lookup and history.
- [ ] Confirm live link is working.

### 3. ApplyFlow / Career Suite

Focus:

- Local-first product architecture
- Privacy-first job application workflow
- Human-in-the-loop automation
- Optional AI coaching
- Product documentation

Checklist:

- [ ] Add screenshots or demo placeholders.
- [ ] Add stronger business impact section.
- [ ] Add architecture diagram or visual flow.
- [ ] Add recruiter review notes.
- [ ] Clarify implementation status vs case-study status.

### 4. jwt-auth

Focus:

- Reusable authentication package
- JWT, refresh token, roles and cookies
- Tests, CI and npm readiness

Checklist:

- [ ] Clarify CommonJS vs ESM support.
- [ ] Add API reference table.
- [ ] Add complete Express refresh-auth example.
- [ ] Confirm npm badge and package metadata.
- [ ] Confirm CI and coverage are accurate.

## Definition of Done

A project is considered recruiter-ready when:

- A recruiter can understand the project in under two minutes.
- A technical reviewer can identify architecture, security and testing decisions quickly.
- The README links to deeper documentation without overwhelming the first screen.
- The project clearly connects technical implementation to business/product value.
- The repository does not rely on private context to make sense.
