# Handoff: Section CRUD

Status: Implemented; integration pending
Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Tasks: [tasks.md](tasks.md)
Updated: 2026-10-05

## Delivered behavior

Existing POST /navigation/section/create-section and GET /navigation/sections
remain unchanged. Added:

- Public GET /navigation/section/:id: SectionDto, 200 or 404.
- Admin PATCH /navigation/section/:id: UpdateSectionDto with at least one of
  sectionTitle, numeric summary, menuSvgPath, headerSvgPath. Titles are trimmed
  (1-120 chars); nulls, wrong types, unknown/server-owned fields and empty updates
  return 400. Omitted values and identifiers are preserved; timestamp is refreshed.
- Admin DELETE /navigation/section/:id: DeleteResultDto, 200; 404 if missing and
  409 if workshops exist. No workshop/page cascade.

Path keys are nonblank strings up to 120 characters. Mixed schema IDs preserve
legacy string keys and ObjectId defaults; no data migration. Explicit ID filters
avoid casting legacy keys to ObjectIds. Errors propagate rather than generating
success-shaped responses. New responses omit database internals.

Implementation: src/navigation/navigation.controller.ts, navigation.service.ts,
dto/create.dto.ts, dto/update.dto.ts and schemas/section.schema.ts.
Generated source: openapi.json and contracts/document/src, including the exported
UpdateSectionDto. Nothing was published, committed or deployed.

## Acceptance and verification evidence

| Scenario/check | Command or method | Result | Limitation |
| --- | --- | --- | --- |
| AC-001 through AC-005, auth regression | npm test -- --runInBand --runTestsByPath src/navigation/section-crud.spec.ts src/navigation/section-creation.spec.ts src/local-development/document-auth.guard.spec.ts | PASS: 71 tests, 3 suites | Real controller/validation/role guards; isolated DB/identity doubles |
| CRUD persistence, legacy IDs, conflict | Direct NavigationService calls using built source and real Mongoose models in a unique document_section_crud_check_* database at 127.0.0.1:27017 | PASS | Not HTTP, external auth or concurrency; fixture records removed and connection closed |
| AC-006 service compilation and schema generation | GENERATE_OPENAPI=true npm run build | PASS | DB-free generation, not runtime auth |
| AC-006 generated contracts | npm run contracts:document:gen; npm run contracts:document:build | PASS | Local generation/compilation only |
| AC-006 observable contract shapes | Node assertions on new GET/PATCH/DELETE paths, required id parameter, 200/400/404/409 responses, editable fields, SectionDto/DeleteResultDto refs and old create/list statuses | PASS | Generated schema checks |
| Targeted lint | eslint on section-crud.spec.ts, dto/create.dto.ts, dto/update.dto.ts, schemas/section.schema.ts, navigation.controller.ts | PASS | Wider NavigationService lint finds one inherited no-unnecessary-type-assertion in toWorkshopDto; confirmed unchanged from HEAD |
| Whitespace | git diff --check | PASS | Checked before final documentation updates |
| Live auth/gateway/editor | Not run | NOT RUN | External owner acceptance |

The built-in test tool returned no discovery; the repository Jest runner supplied
the actual results. Earlier typed-mock/formatting failures were corrected and
rerun successfully. Direct TypeScript deleteOutDir configuration remains an
unrelated historical limitation, not a failed Nest build.

MongoDB check sequence: create a section; read and partially update it; read back
the persisted values; create one workshop fixture; verify delete returns 409 and
the section remains; remove the fixture; delete and verify 404; create/read/update/
list/delete a legacy angular key. Only uniquely isolated test data was touched.

## Contract and consumer handoff

| Owner | Exact action | Ordering and acceptance |
| --- | --- | --- |
| service-document release owner | Deploy additive routes; optionally publish generated UpdateSectionDto contracts in an authorized release | Producer first; confirm no existing create/list consumer regression |
| Ngx-Workshop/mfe-user-journey-admin-document-editor | Adopt public GET and Admin PATCH/DELETE paths above; send only editable fields; merge/remove catalog records only after confirmed success; surface 400/404/409 and persistence failures | After producer deployment; consume released contracts if using generated DTOs; verify rename/metadata/delete journeys |
| Gateway/auth owner | Forward GET/PATCH/DELETE under /api/documents with identity/cookies; verify public reads, anonymous 401 and non-admin 403 | Verify against real deployed service, not generation stubs |

## Remaining work and concurrency

X001 remains external: real auth/gateway/editor acceptance. The backend local
implementation and persistence checks are complete.

Empty-section check and deletion are separate operations. Existing workshop
creation does not lock/check the parent, so concurrent creation can race deletion;
this feature does not claim transactionally enforced relationship integrity.
Updates are atomic per section but last-write-wins. A future integrity feature
must coordinate both workshop creation and section deletion, choose MongoDB
transaction/locking prerequisites and test simultaneous operations.

## Context maintenance

Updated docs/architecture.md, docs/api-contracts.md, docs/development.md,
docs/document-readiness.md and specs/README.md. Constitution and migration
provenance are unchanged. Unrelated workshop/page readiness gaps remain open.
