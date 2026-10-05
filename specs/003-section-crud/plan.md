# Implementation plan: Section CRUD

Status: Implemented; integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-05

## Technical context and source baseline

NestJS 11, TypeScript ~5.7.3, Mongoose 8 and class-validator.
Navigation owns Section and Workshop models. Existing UpdateSectionDto is unused
and only makes the creation title optional. Existing Section _id casting assumes
ObjectIds despite legacy string keys in the public contract.

## Design and requirement mapping

| Requirements | Approach | Source |
| --- | --- | --- |
| FR-001, FR-004 | GET /navigation/section/:id, public, SectionDto or 404 | navigation.controller.ts / navigation.service.ts |
| FR-002 | PATCH same path, Admin; strict optional DTO fields, explicit $set and server timestamp; validators enabled | dto/update.dto.ts / navigation.service.ts |
| FR-003 | DELETE same path, Admin; lookup, workshop existence check, deleteOne; 409 for nonempty, 404 for missing | navigation.service.ts |
| FR-005 | Mixed _id schema retaining ObjectId default; query matches string and ObjectId representations; explicit DTO mapping | schemas/section.schema.ts / dto/create.dto.ts |
| FR-006 | Generate from source, build generated contracts | openapi.json / contracts/document |

## Constitution Check

Preserve all existing routes, response shapes, identifiers and default creation
fields. No editor blocks or workshop/page persistence changes. Runtime DTO checks,
Admin guards and explicit failures protect new operations. No data migration.
Mixed _id storage is necessary to query legacy strings without ObjectId casts;
new records still default to ObjectIds. Raw filter identifiers are strings only.

## Verification, risks and delivery

Add HTTP tests using real guards/validation and isolated model/identity doubles.
Check schema filter casting independently, including legacy and ObjectId IDs.
Cover read/update/delete, protected access, invalid input, missing records,
conflicts and failed writes. Preserve creation tests. Run Jest, Nest build with
OpenAPI generation, contract generation/build and targeted lint.
Direct tsc deleteOutDir failure is inherited; Nest build remains authoritative.

Delete performs no multi-document writes or cascade. The check/create race and
last-write-wins updates are recorded in the spec, not silently treated as atomic
relationship enforcement. No auth/Mongo integration is implied by mocks.

## External owner and order

mfe-user-journey-admin-document-editor: adopt GET/PATCH/DELETE routes with the
SectionDto/UpdateSectionDto/DeleteResultDto shapes; handle 400/404/409 and failed
mutations without changing local catalog state. Deploy producer, optionally
publish contracts in an authorized release, then adopt and verify via gateway.
