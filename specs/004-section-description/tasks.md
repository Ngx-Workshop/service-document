# Tasks: Section description

Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Updated: 2026-10-05

## Local implementation

- [x] T001 - Add DTO validation, schema default and create/read/list/update
  mapping in src/navigation/. Covers FR-001-FR-004 / AC-001-AC-004.
  Depends on: none. Verify: focused HTTP tests.
- [x] T002 - Extend src/navigation/section-creation.spec.ts and
  section-crud.spec.ts. Depends on: T001. Verify: focused suites and auth regression.
- [x] T003 - Build service, regenerate OpenAPI/contracts and compile contracts.
  Covers FR-005 / AC-005. Depends on: T001. Verify: commands and exact schemas.
- [x] T004 - Update architecture/API/development docs and handoff with actual
  verification. Depends on: T002, T003.

## External work

- [ ] X001 - Owner: mfe-user-journey-admin-document-editor. Add description
  create/edit/display mappings and adopt contracts after authorized producer
  deployment/publication. Verify a gateway-backed round-trip including clearing
  and legacy empty descriptions. Does not block local implementation.

## Progress and evidence

T001/T002: 87 tests pass in the two section suites and auth suite; direct local
MongoDB checks pass and three scoped fixtures were removed.
T003: Nest build, OpenAPI generation, contract generation/build and exact
description schema/model checks pass. No publication/deployment.
T004: Architecture, HTTP contracts, development, feature index and
[handoff](handoff.md) updated. External X001 remains pending.
Focused DTO/schema/CRUD lint passes; inherited creation harness/service lint
errors remain, confirmed against HEAD.
