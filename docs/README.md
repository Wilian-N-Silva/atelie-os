# Documentation Index

Updated 2026-06-25.

Use this file to decide which document is authoritative and which files can be
archived or deleted after confirmation.

## Keep as active

- `git-workflow.md` - branch policy. Current and useful.
- `prd-v2.1-atelie-os-instante-ambar.md` - product source spec. Keep as historical/current product reference, even when implementation is ahead.
- `pending-features-review.md` - feature gap tracker. Current source of truth for MVP/partial feature closure and integration roadmap.
- `outstanding-work.md` - current beta launch backlog: QA gates, launch blockers, hardening, and integrations.
- `qa-checklist.md` - manual QA checklist for the current beta branch.
- `feature-log.md` - chronological implementation log.
- `integration-melhor-envio.md` - provider runbook for Melhor Envio.
- `integration-public-tracking.md` - external-site contract for public tracking.
- `manual-base-atelie-os-instante-ambar.md` - long-form base manual/reference draft.

## Duplicated or partly superseded

- `outstanding-work.md` previously duplicated completed MVP gaps that are now tracked in `pending-features-review.md`. It has been trimmed back to active beta work.
- `feature-log.md` overlaps with commit history, but it is still useful as a product-readable delivery log.
- `manual-base-atelie-os-instante-ambar.md` overlaps the PRD and in-app help. Keep it while the user manual is still being assembled.

## Candidate for deletion or archive

- `protocolo.md` - small old quality-test note. The same concept is now represented in the PRD, recipe-test flow, feature log, and in-app/help material. Archive/delete after confirming no one uses it as a standalone shop-floor checklist.

## Next documentation cleanup

- Refresh root `HANDOFF.md`.
- Re-check root `CLAUDE.md` against the actual stack and workflow.
- Keep provider docs updated only when behavior or external API contracts change.
