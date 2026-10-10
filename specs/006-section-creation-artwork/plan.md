# Implementation plan: Optional section creation artwork

Status: Implemented; hosted integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-09

## Technical Context

TypeScript ~5.7.3, NestJS 11, Mongoose 8, class-validator and Swagger.

## Design and verification

FR-001/FR-003: Add optional string path fields with undefined-only validation to
src/navigation/dto/create.dto.ts. UpdateSectionDto inherits these fields; remove
its redundant path declarations while retaining skipNullProperties: false.
FR-002: Explicitly pass paths to sectionModel.create in navigation.service.ts.
The existing section schema supplies defaults; no migration is needed.
FR-004: Build service with GENERATE_OPENAPI=true, generate/build contracts and
assert request schema optionality. Never hand-edit generated code.

Extend section-creation.spec.ts with the exact reported payload, each path alone,
both populated paths, persisted/listed values and invalid types. Run the section
creation/CRUD/auth suites, build and focused DTO lint. Existing unknown fields,
access denial and persistence failure tests cover unchanged boundaries.

## Constitution and delivery

No deviations. service-document owns this additive contract. Release the service
before the editor relies on these fields; the editor already sends the reported
payload. Contract publication/adoption and hosted gateway/auth acceptance belong
to release/editor owners. No package publication or deployment is part of this fix.
