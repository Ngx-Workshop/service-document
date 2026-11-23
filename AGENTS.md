# Agent entry point — service-document

This repository owns the Ngx-Workshop workshop navigation and document persistence service.
All context below is local; sibling checkouts are not required.

## Read before implementation

1. [Constitution](.specify/memory/constitution.md): durable engineering rules.
2. [Architecture](docs/architecture.md): ownership, routes, source map and data.
3. [Development](docs/development.md): setup, checks and existing limitations.
4. [Workflow](.specify/README.md): specify → plan → tasks → implement → verify.
5. [Feature index](specs/README.md): select work from the user's request.
6. [Readiness review](docs/document-readiness.md) and [migration record](docs/seed-adoption.md).

## Working rules

- Inspect source and git status; preserve unrelated work.
- For nontrivial behavior changes maintain local spec, plan, tasks and handoff.
  Small documentation changes need only a concise change and verification record.
- Distinguish source observations, intended behavior and verified outcomes. The
  readiness review is a findings backlog, not authorization to implement it all.
- Preserve document routes, identifiers and serialized editor block compatibility.
  Record producer/consumer changes and delivery order before changing contracts.
- Keep validation in DTOs, routing in controllers and persistence in services. Regenerate OpenAPI/contracts from source for API changes; do not hand-edit generated models.
- Resolve routine choices locally. Ask only for consequential missing decisions;
  continue independent work while they remain pending.
- Verify the changed scope; record actual passes, failures and unavailable integration
  checks separately. Builds and empty test suites do not establish working journeys.
- Update affected context docs and leave exact external-owner handoffs. Do not
  publish packages or deploy merely to validate documentation.

This is a repository-local Markdown workflow inspired by Spec Kit.

## Next task: Code Maintenance

The selected work is [Code Maintenance](specs/010-code-maintenance/spec.md)
(Implemented and locally verified; integration pending).
Read its [plan](specs/010-code-maintenance/plan.md), [tasks](specs/010-code-maintenance/tasks.md) and
[handoff](specs/010-code-maintenance/handoff.md). Local T001–T010 evidence is recorded; retain older unfinished
feature records without treating them as the next task. The requested work covers
NestJS module/domain boundaries, thin controllers, cohesive services, Prettier
with Husky/lint-staged, CI checks and safe domain logging through existing
observability. Follow the handoff for pending Node 22/Docker/Grafana checks;
do not repeat the audit or treat older unfinished features as newly authorized.

Current deployment policy: [deployment-workflows](docs/deployment-workflows.md). Automatic main delivery verifies/deploys; npm publication is manual only. This supersedes older automatic-publishing instructions.
