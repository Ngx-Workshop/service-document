# Feature: Optional section creation artwork

Status: Implemented; hosted integration pending
Feature ID: 006-section-creation-artwork
Created: 2026-10-09
Request/source: Editor creation fails for Rust with empty description and SVG paths.

## Problem and scope

CreateSectionDto allows sectionDescription but omits menuSvgPath/headerSvgPath.
The global forbidNonWhitelisted pipe rejects the editor payload. Fix the service
creation contract and persistence; no editor change or data migration is required.

## Requirements and acceptance

- FR-001 / AC-001: Admin creation accepts omitted or empty-string description,
  menuSvgPath and headerSvgPath, including the exact reported Rust payload.
- FR-002 / AC-002: Supplied SVG paths persist and appear in create/list responses;
  omitted paths retain schema defaults of empty strings.
- FR-003 / AC-003: Null/non-string paths and unknown properties return 400 without
  persistence. Title rules, Admin access and update validation remain intact.
- FR-004 / AC-004: Regenerate and compile OpenAPI/TypeScript contracts from source.

## Boundaries and constitution

Validation stays in DTOs, persistence in NavigationService. Test real HTTP
validation/roles/schema with isolated persistence and identity doubles. Hosted
integration is a separate release check. IDs, workshop/page authoring, ordering,
block serialization and access policy are unchanged. No constitution deviations.
Optional means undefined; strings including empty strings are valid, null is not,
consistent with the existing description and partial-update contract.
