# Atelie OS - Handoff

Orientation for coding agents. Read this first, then use `docs/README.md` for
the documentation map. Technical notes stay ASCII-safe.

## Stack

Next.js 16 App Router, React 19, Tailwind CSS 4, Better Auth, Drizzle ORM, and
PostgreSQL 17. Product language is pt-BR. The app is multi-tenant and
white-label; every app query must be company-scoped.

## Branches

- `main` is the release branch.
- `development` is the integration branch.
- Branch feature work from `development` using `feature/<scope>`, `fix/<scope>`, or `chore/<scope>`.
- Merge finished work back into `development`.
- Promote `development` to `main` only for releases.

Current local integration branch: `development`.

## Local Setup

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Checks:

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Seed identity comes from `.env` (`SEED_*`). Never commit real credentials,
company names, or personal names.

## Environment

Important server-only secrets and production settings:

- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `DATABASE_URL`
- `INTEGRATION_SECRETS_KEY`
- `OPENAI_API_KEY` / `OPENAI_TEXT_MODEL`
- `MELHOR_ENVIO_*`
- `RESEND_API_KEY`
- `R2_*` / S3-compatible storage variables
- Standalone/self-hosted flags and login copy variables

For local dev, `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must match how the
app is opened, or Better Auth returns 401 on sign-in.

## Documentation Map

- `docs/README.md` - documentation index and maintenance rules.
- `docs/feature-map.md` - single feature map: status, delivered history, launch gates, integrations, deferred scope.
- `docs/qa-checklist.md` - manual beta QA procedure.
- `docs/prd-v2.1-atelie-os-instante-ambar.md` - product spec and acceptance reference.
- `docs/integration-melhor-envio.md` - Melhor Envio setup and operational runbook.
- `docs/integration-public-tracking.md` - public tracking API contract.
- `docs/git-workflow.md` - branch policy.
- `CLAUDE.md` - architecture invariants and current backend notes.

## Key Files

- `src/db/schema.ts`, `src/db/seed.ts`, `src/db/client.ts`
- `src/lib/app-route-context.ts` - auth and active company context.
- `src/lib/deployment.ts` - standalone/self-hosted deployment config.
- `src/lib/stock-balances.ts` - stock derived from movements.
- `src/lib/workflows.ts`, `src/lib/workflow-status.ts`, `src/lib/workflow-automations-server.ts` - configurable workflows and automations.
- `src/lib/integration-secrets-server.ts` - encrypted provider credentials.
- `src/lib/shipping-integrations-server.ts` - Melhor Envio server integration.
- `src/lib/public-tracking.ts` - sanitized public tracking mapper.
- `src/screens/settings.tsx` - branding, team, workflows, labels, shipping, and related settings.

## Current Priorities

1. Manual QA from `docs/qa-checklist.md`.
2. Tenant isolation validation with a fresh tenant.
3. Physical barcode print/scan validation.
4. Standalone/self-hosted smoke test when targeting a client subdomain.
5. Melhor Envio sandbox validation if shipping labels are part of beta scope.
