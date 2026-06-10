# WhatsApp Platform — Testing Strategy

This document describes the testing strategy for the WhatsApp Platform app.

The app combines authentication, onboarding, billing, tenant configuration, metrics, queues, agents, FAQ, feedback, exports and accessibility checks. The testing strategy should protect the product flows that are most important for SaaS and white-label operation.

## Testing Goals

- Validate authentication behavior.
- Validate tenant onboarding and configuration.
- Validate product mode behavior for SaaS and white-label flows.
- Validate billing webhook boundaries.
- Validate metrics and admin access protection.
- Validate agents, queues and assignment flows.
- Validate FAQ and feedback behavior.
- Validate export endpoints.
- Validate accessibility on critical flows.

## Unit Tests

Unit tests should cover isolated business logic and domain helpers.

Examples:

- Auth service behavior
- Product mode helpers
- White-label contract sanitization
- Billing state mapping
- Tenant update logic
- FAQ validation
- Feedback rating validation
- Export formatting helpers

## API Route Tests

API route tests should validate request/response behavior.

Important routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/tenants/me`
- `PATCH /api/tenants/me`
- `POST /api/tenants/me/api-key`
- `POST /api/stripe/webhook`
- `GET /api/metrics/overview`
- `GET /api/metrics/agents`
- `GET /api/metrics/intents`
- `GET /api/admin/agent-status`
- `PATCH /api/admin/agent-status`
- `GET /api/admin/queues`
- `GET /api/admin/queue/next`
- `POST /api/admin/conversations/:id/assign`
- `GET/POST /api/faq`
- `GET/PUT/DELETE /api/faq/:id`
- `POST /api/admin/messages/:id/feedback`
- `GET /api/admin/feedback-report`

## Integration Boundary Tests

External systems should be mocked at boundaries.

Important boundaries:

- Stripe checkout
- Stripe webhook events
- Supabase/Prisma persistence
- Email/support notification provider
- Webhook notification provider
- WhatsApp configuration or platform adapters

## Product Mode Tests

Product mode behavior is critical.

Tests should verify:

- SaaS mode exposes billing-related UI/contracts where appropriate.
- White-label mode sanitizes public responses for managers/operators.
- Server-side billing logic remains available internally.
- White-label response types remain stable.

## Authentication and Authorization Tests

Tests should cover:

- Signup success
- Login success
- Invalid login
- Missing cookie/session
- Protected tenant routes
- Admin route protection
- Admin metrics secret behavior
- Platform admin-only accessibility flows where applicable

## Billing Tests

Tests should cover:

- Checkout creation
- Stripe webhook signature handling
- Plan activation
- `plan` update
- `activeUntil` update
- Invalid webhook payload
- Missing webhook secret

## Operational Workflow Tests

Tests should cover:

- Agent status list/update
- Queue listing
- Next queue item assignment
- Conversation assignment
- Conversation search
- Message/conversation export
- Feedback rating submission
- Feedback report generation

## Accessibility Tests

The app includes Playwright + axe checks for critical flows and Product UI surfaces.

Run locally (no credentials — login only, authenticated tests skipped):

```bash
pnpm test:a11y
```

Authenticated flows require env vars (in `.env.local`, never commit values):

```bash
E2E_WHATSAPP_ADMIN_EMAIL=
E2E_WHATSAPP_ADMIN_PASSWORD=
# optional staging:
E2E_WHATSAPP_BASE_URL=https://your-staging.example.com
```

Product UI subset:

```bash
pnpm test:a11y:product-ui
```

Session reuse: `tests/setup/global-auth.setup.ts` saves `tests/.auth/whatsapp-admin.json` (gitignored).

For axe coverage on `/admin/whatsapp`, the user must be `platform_admin`.

CI: `.github/workflows/whatsapp-platform-a11y.yml` with GitHub secrets `E2E_WHATSAPP_*`.

## Main Commands

```bash
pnpm test
pnpm test:a11y
```

## Critical Flows to Protect

```text
Signup
  ↓
Stripe checkout when applicable
  ↓
Login/session
  ↓
Onboarding
  ↓
WhatsApp configuration
  ↓
Dashboard metrics
  ↓
Agent/queue operations
  ↓
Feedback/export/support workflows
```

## Recruiter Notes

This testing strategy demonstrates:

- Product flow awareness
- SaaS and white-label testing concerns
- Auth and admin protection coverage
- Billing/webhook boundary awareness
- Operational dashboard testing
- Accessibility discipline with Playwright + axe
