# Implementation plan: Section description

Status: Implemented; integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-05

## Technical Context

**Language/Version**: TypeScript ~5.7.3 / NestJS 11
**Primary Dependencies**: Mongoose 8, class-validator, Swagger, ngx-auth-client
**Storage**: MongoDB Section; Workshop and WorkshopPage unchanged
**Project Type**: Document REST service and generated TypeScript contracts

## Design and requirement mapping

| Requirement | Approach | Files/boundaries affected |
| --- | --- | --- |
| FR-001, FR-004 | Optional Swagger string plus undefined-only validation; schema default ''; pass field to create | src/navigation/dto/create.dto.ts, schemas/section.schema.ts, navigation.service.ts |
| FR-002 | Inherit validation through existing PartialType; include field in the explicit update allowlist | src/navigation/dto/update.dto.ts, navigation.service.ts |
| FR-003 | Default absent descriptions in single mapping and lean list mapping; retain existing list fields | src/navigation/navigation.service.ts |
| FR-005 | Build with GENERATE_OPENAPI=true, regenerate and build contracts | openapi.json, contracts/document/src/ |

## Constitution Check and compatibility

No deviations: validation, persistence and routing stay with existing owners.
Schema default alone does not cover lean legacy list records, so both response
mappings must explicitly supply the empty string. No data migration is needed.
No null writes are accepted. Summary remains numeric. Access/IDs/routes unchanged.
Existing user import-order changes in create.dto.ts must be retained.

## Verification plan

Extend section-creation.spec.ts for omitted/provided/empty/multiline descriptions,
invalid types and lean legacy defaults. Extend section-crud.spec.ts for single
reads, legacy absence, description-only updates/clears, omission preservation and
invalid input. Run both suites with document-auth.guard.spec.ts, focused ESLint,
the Nest build, contract generation/build and exact generated schema checks.
Mocks exercise actual validation, role guards and Mongoose defaults, not live DB.
Additionally verify direct service create/read/list/update/clear/default/legacy
behavior against an isolated local MongoDB database, cleaning only fixture IDs.

## External dependencies and delivery order

service-document deploys additive runtime behavior first. The editor owner then
adopts published generated contracts and adds create/edit/display mappings,
sends only editable fields and merges confirmed responses. Gateway/auth/editor
round-trip verification and authorized publication/deployment remain pending.
