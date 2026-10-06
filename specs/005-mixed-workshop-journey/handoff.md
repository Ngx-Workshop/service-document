# Mixed workshop journey handoff

Status: Implemented; frontend integration pending · 2026-10-05

## Delivered

WorkshopDto.workshopDocuments is generated as a true PAGE | ASSESSMENT_TEST |
CODING_LAB union. Every placement has an entry _id, kind, name and sortId; external
placements also have an opaque resourceId. New Admin POST /navigation/page/add-reference
accepts workshopId/kind/resourceId/name and returns 201 WorkshopDto. Existing page
create, rename, reorder and delete support mixed navigation. Reorder validates a full
permutation and preserves stored metadata; concurrent changes cause 409 via __v.
Every journey mutation increments __v. Pipeline appends allocate positions atomically
and protect opaque strings with $literal. Public workshop lists expose the union.

Removing external entries never deletes remote content. Workshop cascade targets
only PAGE IDs using $in, fixing the old object-array deletion filter. Owned content
creation checks parent existence and compensates failed linking. Multi-document
page/workshop deletion and cleanup failure remain nontransactional limitations.

## Verification

125 passing Jest tests (38 new); service build/OpenAPI generation and generated
contracts build pass. Focused changed-source ESLint passes. Isolated real MongoDB
check via npm run test:journey:mongo passes eight concurrent appends, opaque/repeated
IDs, mixed reorder, concurrent revision conflict, rename, unlink, page append and
cascade; dedicated database removed. Generated OpenAPI union/discriminator and
request/response assertions pass. Codegen emits an extra terminal blank line in
WorkshopDto reported by diff whitespace check. No real auth/gateway/browser check,
package publication or deployment performed.

## External-owner adoption

1. Release this service and its generated @tmdjr/document-contracts package together
   using the normal release workflow. No release is authorized by this handoff.
2. mfe-user-journey-admin-document-editor adopts WorkshopDto and required kind.
   Add assessment/lab selection via those services' existing APIs, then POST
   /navigation/page/add-reference with workshop Mongo ID and selected opaque ID.
   Keep full mixed entries when sorting; use entry _id for rename/remove. Render
   document editor only for PAGE; present external placements with their kind/label.
3. Workshop renderer consumes the ordered union: PAGE resolves entry _id from
   documents; ASSESSMENT_TEST/CODING_LAB resolve resourceId through owning service.
   Show useful missing/unavailable states. Do not treat external entry _id as a
   remote resource ID. Embedded pageType is not the journey discriminator.
4. Browser acceptance: create page → assessment → lab → page, reload, reorder,
   rename navigation labels, unlink an external placement, verify remote resource
   remains and workshop cascade removes only owned document content.

Assessment and coding-lab services need no changes for reference persistence. No
completion/scoring/cross-service existence policy is implemented. Greenfield
contract exceptions are in spec/plan; consumers cannot use old untyped entries.
