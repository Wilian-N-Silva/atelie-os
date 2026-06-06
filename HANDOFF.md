# Atelie OS - Handoff

Orientation for coding agents. Read this, then use the doc map below. Technical notes stay ASCII-safe.

## Stack
Next.js 16 App Router, React 19, Tailwind CSS 4, Better Auth + Drizzle ORM, PostgreSQL 17 (Docker Compose for local dev). Product language is pt-BR. Multi-tenant and white-label: keep every app query company-scoped.

## Branches
- `main` release; `development` integration; branch feature work from `development`.
- Current slice: `feature/remove-localstorage-persistence`.
- The working tree may hold unrelated `design/**` prototype edits; keep them out of app commits.

## Local setup
```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```
Checks: `npm run lint`, `npm run test`, `npm run build`. Seed identity comes from `.env` (`SEED_*`); never commit real credentials, company names, or personal names.

## Environment
Server-only secrets: `INTEGRATION_SECRETS_KEY` (encrypts provider tokens), `OPENAI_API_KEY` / `OPENAI_TEXT_MODEL` (bundled AI), `MELHOR_ENVIO_*` (OAuth). For local dev, `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must match how the app is opened (localhost vs ngrok), or Better Auth returns 401 on sign-in.

## Doc map
- `docs/prd-v2.1-atelie-os-instante-ambar.md` - authoritative product spec.
- `docs/feature-log.md` - delivered features, concise (one line each).
- `docs/outstanding-work.md` - pending work, PRD coverage gaps (section H), integration roadmap (section I).
- `docs/integration-melhor-envio.md` - shipping integration notes.
- `docs/git-workflow.md` - branching rules.
- `CLAUDE.md` - architecture invariants and current backend notes (authoritative for both).

## Key files
- `src/db/schema.ts`, `src/db/seed.ts`, `src/db/client.ts` (dev pool `max` 10).
- `src/lib/app-route-context.ts` (auth + active company), `src/lib/stock-balances.ts` (stock from movements).
- `src/lib/workflows.ts` / `workflow-status.ts` / `workflow-automations-server.ts` (configurable workflows + automations).
- `src/lib/shipping-integrations-server.ts`, `src/lib/integration-secrets-server.ts` (Melhor Envio OAuth + AES-256-GCM secrets).
- `src/screens/settings.tsx` (branding, users, workflows, labels, shipping).
