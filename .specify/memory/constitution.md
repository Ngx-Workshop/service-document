# Constitution — Document service

Version: 1.0.0 · Adopted: 2026-10-01

These principles guide future changes. Current gaps are recorded in the readiness
review; adoption does not certify the existing implementation.

## 1. Own the document domain

Own sections, workshop metadata and page content through NestJS controllers,
DTOs, services and Mongoose models. Shell composition, uploads and authentication
identity are external responsibilities. Do not bypass another service's API.

## 2. Preserve contract compatibility

Treat routes, DTOs, status/error behavior, identifiers and serialized block content
as public contracts. The html field stores JSON text. Keep workshop slug, workshop
Mongo ID and page Mongo ID distinct. Regenerate OpenAPI and TypeScript contracts
from source for API changes; record package publication and consumer adoption
separately from local generation.

## 3. Enforce access and validation on the server

Preserve explicitly public reads and administrator mutation policy unless scope
includes an access change. Validate runtime payloads, array elements, identifiers
and parent/page ownership; TypeScript annotations alone are insufficient. Keep
credentials out of source. Generation-only stubs must never become runtime auth.

## 4. Maintain relationship integrity

Keep workshop page references and page records coherent during create, rename,
reorder and delete. Specify partial-failure, concurrent-write and missing-parent
behavior before changing multi-document operations. Do not treat a denormalized
reference update as proof that the page record changed.

## 5. Verify observable behavior

Cover changed routes, invalid input, access denial, persistence failures and relevant
regressions with meaningful tests. Distinguish mocked checks from MongoDB/auth
integration. Do not report empty suites, a generated schema or a listening socket
as proof of a working authoring journey.

## 6. Keep context usable in this checkout

Maintain architecture, commands, limitations and feature artifacts locally. Separate
observations from intended outcomes. Record external owners, exact contracts,
delivery order and outstanding acceptance checks without requiring sibling source.

## Amendments

Document rationale, version/date changes and affected template/context updates.
Record feature-specific exceptions in its plan with impact and follow-up.
