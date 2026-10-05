# Tasks: Section CRUD

Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Updated: 2026-10-05

- [x] T001: Add section DTOs, compatible schema queries, service CRUD and routes.
  Covers FR-001 through FR-005. Depends on: none. Verify HTTP and casting tests.
- [x] T002: Test success, invalid input, missing records, roles, conflicts and
  persistence failures in src/navigation/section-crud.spec.ts.
  Depends on: T001. Verify focused Jest suites including creation regressions.
- [x] T003: Build service and regenerate/build OpenAPI contracts.
  Covers FR-006. Depends on: T001. Verify generated paths, schemas and compilation.
- [x] T004: Update context documentation and verification handoff.
  Depends on: T002, T003. Verify actual results and outstanding checks are separate.
- [ ] X001: Editor/gateway owners: consume new routes and verify real
  MongoDB/auth/gateway authoring journey after authorized release.
  Does not block local implementation; no deployment/publication authorized.

## Constitution Check

Preserve identities, auth policy, serialized blocks and existing routes. Explicitly
record mocked acceptance and the concurrent creation/deletion limitation.

## Progress and evidence

T001/T002: 71 Jest tests pass across section CRUD, creation and local auth; isolated
real MongoDB service checks pass, including legacy IDs and nonempty conflict.
T003: Nest/OpenAPI build, generated path/status/shape assertions and contract
generation/compilation pass. New CRUD test/DTO/schema/controller lint passes.
Wider service lint has one confirmed inherited workshop helper assertion error.
T004: Architecture, HTTP contracts, development, readiness and feature index
updated; [handoff.md](handoff.md) records exact evidence and external actions.
