# Document service readiness review

Reviewed 2026-10-01 at ec50bd0. These are source-backed risks and proposed acceptance
checks. Runtime failures have not been reproduced unless stated in development.md.

| ID | Evidence and current gap | Owner / proposed acceptance |
| --- | --- | --- |
| API-01 | NavigationController marks sections as an array although findAllSections returns one wrapper; several response schemas differ from mapped DTOs. Generated contract names lag current source. | Service: align metadata/runtime, regenerate and build contracts, then verify editor mappings and a compatible package version. |
| DATA-01 | NavigationService createWorkshop/createPage use multiple writes without transactions; createPage creates content before checking parent existence. | Service: specify atomicity/compensation; test missing parent and failures between writes without orphan pages. |
| DATA-02 | editPageNameUpdateWorkshop and sortPages change embedded references only; page name/sortId remain unchanged. | Service: decide canonical ordering/name ownership; test navigation and direct page reads agree after updates. |
| DATA-03 | WorkshopDocumentService.deleteMany passes reference objects as the _id filter instead of extracting IDs; cascade outcome needs verification. | Service: test workshop deletion removes exactly its pages and reports failures truthfully. |
| DATA-04 | deletePageAndUpdateWorkshop accepts independent parent and page IDs; it does not require page membership before deletion. sortPages replaces references without checking ownership. | Service: reject cross-workshop, duplicate, missing and foreign page IDs without changing unrelated records. |
| API-02 | Inline bodies for content save/workshop delete and bare array bodies lack class/element validation. Page IDs are not consistently Mongo-ID validated. | Service: test unknown fields, invalid IDs, malformed arrays, missing IDs and invalid JSON blocks; define stable 400/404 behavior. |
| DATA-05 | updateWorkshopHtml only changes html; lastUpdated is a default, not an automatic update. No revision or concurrency control exists. | Service + remote: define timestamp/save-conflict semantics and verify concurrent writes and failed saves. |
| API-03 | Section ObjectId declaration and stringified-ID map may not match the editor's static section route keys. Slugs change on rename and have no uniqueness constraint. | Service + remote: verify representative records; decide section and slug compatibility before changing identifiers. |
| AUTH-01 | Global guards and Admin decorators are present, but health lacks public exemption and actual auth integration is untested. | Service + auth owner: check anonymous/public reads, unauthenticated writes, non-admin denial and admin success. |
| TOOL-01 | tsconfig.build.json contains deleteOutDir; direct compiler check fails. E2E test still expects Hello World at an absent root route; no src unit specs exist. | Service: repair compiler configuration and add meaningful route/service tests in a scoped implementation. |
| TOOL-02 | swagger.ts sets GENERATE_OPENAPI after static AppModule import. | Service: launch generation with env set beforehand; verify generation without MongoDB and runtime with real guards/models separately. |
| EXT-01 | The editor calls an uploader route absent here; PAGE/EXAM strings and a Published UI label have no corresponding lifecycle/scoring API. | Gateway/product + remote: identify upload owner and decide any additional lifecycle scope; do not invent existing endpoints. |

## Handoff and next action

Recommended first scoped feature: repair contract generation/build and align
identifier/response expectations with mfe-user-journey-admin-document-editor.
Then specify integrity and validation fixes with persistence failure tests.
These recommendations do not authorize publishing, deployment or all listed fixes.
See [contracts](api-contracts.md) for delivery order and [development](development.md)
for actual verification evidence. Use an isolated test database for future destructive
CRUD acceptance checks; auth and gateway validation require their real integrations.

## Section creation update — 2026-10-03

[001 Create sections](../specs/001-create-sections/handoff.md) implements named section
creation and dynamic ID-based catalog links, resolving the static catalog portion
of UI-02/API-03. Section-list Swagger shape is corrected and contracts regenerated,
including the missing-model build repair. Existing workshop slug and unrelated
validation/CRUD findings remain open. Live integration acceptance is still pending.

## Section CRUD update — 2026-10-05

[003 Section CRUD](../specs/003-section-crud/handoff.md) adds public single-section
reads and Admin partial updates/deletes, preserving existing create/list routes.
Mixed schema IDs and lookup filters preserve legacy strings and ObjectIds without
data migration; both were verified against an isolated local MongoDB database.
New operation DTOs, failures, roles and generated shapes are covered locally.
Deletion rejects sections containing workshops; the check is not synchronized
with concurrent workshop creation. Real gateway/auth/editor acceptance, workshop
slug behavior and unrelated readiness findings remain open.
