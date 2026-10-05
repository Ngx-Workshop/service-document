# Feature: Section description

Status: Implemented; integration pending
Feature ID: 004-section-description
Created: 2026-10-05
Updated: 2026-10-05
Request/source: Add sectionDescription; requester selected an optional string with
an empty-string default for new and existing sections.

## Scope and source evidence

Section DTOs, schema and NavigationService currently expose only a section title,
numeric summary, artwork paths and timestamp. Add description persistence and
create/read/list/update support. Workshop/page behavior, identifiers, access policy,
deployment and package publication are outside this feature.

## Requirements and acceptance

- FR-001 / AC-001: Admin creation accepts an optional string sectionDescription,
  persists it verbatim and returns it. Omission defaults to an empty string.
- FR-002 / AC-002: Admin partial updates can change or clear the description with
  an empty string. Omission preserves an existing description. Description-only
  patches are valid and refresh categoriesLastUpdated.
- FR-003 / AC-003: Public single and map-shaped list responses always include a
  string sectionDescription. Legacy records without the field return an empty
  string without migration or identifier changes.
- FR-004 / AC-004: Null and non-string descriptions return 400 without a write.
  Existing role restrictions, errors, title validation and routes remain intact.
- FR-005 / AC-005: Regenerate OpenAPI and TypeScript contracts from source and
  compile service and contracts.

## Decisions and quality

The requester confirmed optional string/empty-string semantics. No trimming or
new length limit is introduced for description text. Preserve whitespace and
multiline strings. Keep numeric summary unchanged. Only undefined is omission;
null is invalid. Use existing DTO validation and schema defaults.

## Constitution and external boundaries

Keep validation in DTOs and persistence in services. Test HTTP behavior using the
existing real validation/role/schema harness with database and identity doubles.
Direct service calls against isolated local MongoDB verify persistence separately.
External auth, gateway and editor acceptance remain separate checks.
No document blocks, workshop references, keys or slugs change.

service-document owns the additive field and generated contracts. Deploy the
producer before enabling description writes in
mfe-user-journey-admin-document-editor; publish/adopt contracts only in an
authorized release. Older title-only callers remain valid.
