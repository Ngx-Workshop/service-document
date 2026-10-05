# Feature: Section CRUD

Status: Implemented; integration pending
Feature ID: 003-section-crud
Created: 2026-10-05
Updated: 2026-10-05
Request/source: Add all CRUD operations for sections.

## Problem, scope and current evidence

Admins can create sections and everyone can list them, but there are no single
read, update or delete routes. Extend the navigation controller/service; do not
change workshop/page routes, slugs, block storage or external authentication.

## Functional requirements and acceptance

- FR-001 / AC-001: Preserve existing create (201) and map-shaped public list (200).
  Add public single-section reads (200) with the same SectionDto shape.
- FR-002 / AC-002: Admins can partially update title, numeric summary and both SVG
  paths. Trim titles; require 1-120 characters. Reject null, wrong types, unknown
  fields and empty patches (400). Preserve unspecified fields and identifiers.
  Set categoriesLastUpdated on a successful update.
- FR-003 / AC-003: Admins can delete empty sections (200, DeleteResultDto).
  A section containing workshops returns 409 without deleting any records.
  This policy and the editable fields were selected by the requester.
- FR-004 / AC-004: Missing records return 404, invalid identifiers return 400,
  anonymous mutations return 401, and non-admin mutations return 403.
- FR-005 / AC-005: Preserve both legacy string keys and ObjectId-based keys.
  Failed persistence returns an error, never a success-shaped result.
- FR-006 / AC-006: Regenerate OpenAPI and TypeScript contracts; compile both.

## Boundaries, quality and success criteria

Identifiers remain opaque nonempty strings (maximum 120 characters), allowing
legacy keys such as angular and new Mongo IDs. No records are migrated.
Server-owned _id and timestamps cannot be submitted in updates.
Real controllers, validation, role guards and Mongoose schema/query casting must
be tested with isolated persistence/identity doubles. Direct service calls against isolated local MongoDB verify persistence separately.
Live HTTP/auth/gateway and editor acceptance remain explicit integration work.

## Constitution Check and concurrency

Keep validation in DTOs, routes in controllers and persistence in services.
Do not cascade or change workshop/page references. An empty-section check precedes
deletion; simultaneous workshop creation can race that check because existing
workshop creation does not coordinate with section mutations. Cross-operation
transaction/locking redesign is out of scope and is not claimed as verified.
Single-section update/delete are atomic writes; concurrent updates are last-write-wins.

## External handoff

service-document produces additive routes and generated models.
mfe-user-journey-admin-document-editor owns consuming these routes and refreshing
catalog state after confirmed mutations. Deploy the producer before enabling UI;
package publication and deployments are not part of this request.
