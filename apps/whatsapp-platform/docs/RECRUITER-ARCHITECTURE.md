# WhatsApp Platform — Recruiter Architecture Notes

This document explains the WhatsApp Platform app from a recruiter and technical reviewer perspective.

The goal is to make the architecture easy to understand without requiring deep context from the full DevFlow monorepo.

## Product Role in the DevFlow Ecosystem

WhatsApp Platform is the operational SaaS/white-label product for WhatsApp-based customer support and automation.

It is designed to support:

- Tenant onboarding
- WhatsApp configuration
- Metrics dashboards
- Agent and queue management
- Billing in SaaS mode
- Sanitized contracts in white-label mode
- Support, FAQ, feedback and export workflows

## High-Level Architecture

```text
User / Manager / Operator
  ↓
Next.js App Router UI
  ↓
API Routes
  ↓
Domain services and adapters
  ↓
Prisma ORM
  ↓
PostgreSQL / Supabase

Stripe
  ↔ Billing routes and webhook handling

WhatsApp platform configuration
  ↔ Tenant onboarding and API key setup
```

## App Responsibilities

The app is responsible for the product-facing layer of the WhatsApp Platform.

Core responsibilities:

- Authentication
- Signup and login
- Tenant onboarding
- WhatsApp number and prompt setup
- API key generation
- Metrics dashboard
- Agent status management
- Queue and conversation assignment
- FAQ management
- Message feedback
- CSV export flows
- In-app support reporting
- SaaS/white-label contract control

## Product Mode Architecture

`NEXT_PUBLIC_PRODUCT_MODE` controls whether the UI behaves as a SaaS product or as a white-label operational app.

### SaaS Mode

In SaaS mode:

- Billing is visible to the user.
- Stripe checkout is part of the product flow.
- Signup can lead into plan activation.
- The user-facing contract can expose subscription context.

### White-Label Mode

In white-label mode:

- Billing details are hidden from managers/operators.
- Public HTTP contracts are sanitized.
- Operational workflows remain available.
- Server-side billing capabilities may still exist internally.

This separation allows the same product base to support different commercial models.

## Data and Persistence

The app uses Prisma and PostgreSQL/Supabase.

Important persistence concepts:

- Tenants
- Users
- Agent status
- Queues and conversations
- Messages
- FAQs
- Feedback reports
- Billing/subscription state
- Exportable operational data

## Authentication and Tenant Context

The app uses JWT-based authentication with cookies.

Expected flow:

```text
User signs up or logs in
  ↓
Server validates credentials
  ↓
JWT session is established through cookies
  ↓
Tenant context is loaded through API routes
  ↓
User interacts with tenant-scoped product areas
```

## Onboarding Flow

After signup or checkout, the user goes to `/onboarding`.

The onboarding wizard captures:

1. WhatsApp number
2. Prompt/business behavior
3. API key generation

This links operational WhatsApp configuration to the tenant.

## Metrics and Operations

The product includes operational dashboards for:

- Overview metrics
- Agent metrics
- Intent metrics
- Conversation volume
- Queue state
- Feedback reports

These screens convert WhatsApp operations into measurable business activity.

## External Integration Boundaries

### Stripe

Used for checkout and billing webhooks in SaaS mode.

### WhatsApp Configuration

Used to configure tenant-level WhatsApp behavior and API access.

### Support Notifications

Support reports can send technical context without tokens through configured channels.

## Why This Architecture Matters

The project demonstrates more than UI implementation. It shows product architecture around:

- SaaS vs white-label modes
- Tenant onboarding
- Billing and webhook integration
- Operational dashboards
- Secure product contracts
- Admin and manager workflows
- Accessibility checks
- Documentation inside a monorepo

## Recruiter Notes

This project is useful for evaluating:

- Product engineering maturity
- Next.js App Router architecture
- SaaS/white-label thinking
- Authentication and tenant flows
- Billing integration
- Operational dashboard design
- Complex product documentation
