# Implementation plan: Mixed workshop journey

Status: Implemented; frontend integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-05

## Technical Context

**Language/Version**: TypeScript ~5.7.3 / NestJS 11
**Primary Dependencies**: Mongoose 8, class-validator, Swagger, ngx-auth-client
**Storage**: MongoDB Workshop and WorkshopPage
**Project Type**: Document REST service and generated TypeScript contracts

## Design

DTOs in src/navigation/dto/journey.dto.ts define two external identifier types and
add-reference input. WorkshopPageIdentifierDto is the PAGE variant. WorkshopDto uses
OpenAPI oneOf plus kind discriminator. Explicit embedded schema persists the union.
Retain workshopDocuments and existing page routes; add POST /navigation/page/add-reference.
Frontend supplies kind, resourceId, name and workshopId. Service generates entry ID.
Use atomic pipeline appends with $literal for user strings and next maximum sortId.
Reorder validates concrete DTOs, requires a full permutation, and writes canonical
stored metadata using an revision compare-and-set filter. Removing an entry checks
membership in the atomic update; cascade extracts only PAGE IDs.

## Constitution Check

Ownership, server validation and generated-contract requirements satisfied. No
foreign service imports. Greenfield exception to compatibility explicitly authorized
by user: mandatory kind, server-managed journey on workshop creation; consumers need
new package adoption. Serialized editor blocks, slugs, section IDs and auth policy
retain their contracts. Tests distinguish isolated persistence/auth from integration.

## Failure and concurrency semantics

External mutations touch one workshop atomically. Rename changes the navigation
label only. Workshop __v compare-and-set prevents reorder from overwriting concurrent
append/remove/rename/reorder. Page creation checks parent first and compensates a
failed parent append by deleting its newly created page. Cleanup itself can fail.
Every journey mutation increments __v, including pipeline appends.
Owned page removal and workshop cascade remain separate writes: a failed page deletion
can leave an orphan; no distributed transaction or claim of all-or-nothing behavior.
Concurrent workshop cascade/page creation remains an existing multi-record race.

## Delivery and verification

Generate/build contracts locally; later release service/package together, then update
mfe-user-journey-admin-document-editor and workshop renderer to switch on kind and
resolve external resources through their existing APIs. No assessment/coding-lab
service change needed. Verify HTTP validation/Admin access, mocked failure paths,
Mongoose schema, generated union and isolated MongoDB pipeline/CRUD if available.
Gateway, external auth and complete browser journey remain external checks.
