# Document HTTP contract map

Source review: 2026-10-05. This describes current controllers and caller mappings,
not a live integration test. Production adds `/api/documents` to these service
paths through the gateway; development uses `http://localhost:3007` directly. No global prefix is set in service main.ts.

| Method and service path | Request | Actual service return | Declared access |
| --- | --- | --- | --- |
| POST /navigation/section/create-section | `{ sectionTitle, sectionDescription?, menuSvgPath?, headerSvgPath? }` (title trimmed, 1–120 chars; optional fields are strings) | SectionDto, HTTP 201 | Admin |
| GET /navigation/sections | none | `{ sections: Record<string, SectionDto> }` | Public |
| GET /navigation/section/:id | Section key in path | SectionDto, HTTP 200; 404 if missing | Public |
| PATCH /navigation/section/:id | UpdateSectionDto: optional sectionTitle, sectionDescription, numeric summary, menuSvgPath, headerSvgPath; at least one required | SectionDto, HTTP 200; server timestamp refreshed; 400 for invalid input, 404 if missing | Admin |
| DELETE /navigation/section/:id | Section key in path | DeleteResultDto, HTTP 200; 404 if missing, 409 if workshops exist | Admin |
| GET /navigation/workshops | `section` query | WorkshopDto[] ordered by sortId | Public |
| POST /navigation/workshop/create-workshop | CreateWorkshopDto | WorkshopDto with initial page reference | Admin |
| POST /navigation/workshop/edit-workshop-name-and-summary | UpdateWorkshopDto, including _id | WorkshopDto; name, summary, thumbnail and slug updated | Admin |
| POST /navigation/workshop/delete-workshop-and-workshop-documents | `{ _id }` | `{ acknowledged, deletedCount }` for workshop deletion | Admin |
| POST /navigation/workshop/sort-workshops | UpdateWorkshopDto[] | WorkshopDto[]; response order is not guaranteed | Admin |
| POST /navigation/page/create-page | CreateWorkshopPageDto with workshopId | Updated WorkshopDto | Admin |
| POST /navigation/page/delete-page-and-update-workshop | DeletePageParamsDto: _id, workshopId, name | DeleteResultDto | Admin |
| POST /navigation/page/edit-page-name-update-workshop | _id, workshopId, name | Updated WorkshopDto (embedded reference renamed) | Admin |
| POST /navigation/page/sort-pages | WorkshopPageIdentifierDto[]; workshopId query | One updated WorkshopDto | Admin |
| GET /workshop/health | none | `{ status: 'All good Maybe....?' }` | Global guards; no public exemption |
| GET /workshop/workshops | none | WorkshopPage[] | Global guards plus DocumentAuthGuard |
| GET /workshop/:objectId | page Mongo ID | WorkshopPage document | Public |
| POST /workshop/update-workshop-html | `{ _id, html }` | Updated WorkshopPage document | Admin |

Public means `@Auth(AuthType.None)`; Admin means `@Roles(Role.Admin)` under global
AuthenticationGuard and RolesGuard registrations. Actual external auth behavior
still needs integration checks. POST handlers lack explicit HttpCode overrides;
Nest's default POST status is 201 even where Swagger advertises ApiOkResponse.

## Data distinctions

- Section keys come from Section._id stringification. The catalog links use returned
  IDs, preserving legacy angular/nestjs/rxjs keys. New sections get ObjectIds; no
  existing records or workshop sectionId values are migrated.
- New single-section routes accept nonblank string keys of up to 120 characters,
  matching legacy string IDs and ObjectIds without changing their representation.
  Section updates reject nulls and server-owned fields, trim titles (1-120 chars),
  retain omitted fields and allow empty SVG strings. Empty patches return 400.
  sectionDescription is an optional string on create/update and a required string
  in responses. Creation defaults it to ''; legacy records without it also return
  ''. Updates preserve it when omitted and accept '' to clear it. Whitespace and
  multiline descriptions are preserved, with no new length limit. Nulls and
  non-string descriptions return 400. Creation also accepts optional SVG path
  strings, persists supplied paths and defaults omitted paths to empty strings.
  Empty path strings are valid; null/non-string paths return 400. Numeric summary
  remains unchanged.
  Deletion never cascades to workshops/pages. Its existence check does not
  serialize concurrent workshop creation; cross-operation coordination remains
  a separate integrity requirement.
- Workshop._id identifies mutations; workshopDocumentGroupId is a name-derived
  slug used by the UI route named :workshopId. Renaming recalculates that slug.
- Workshop.workshopDocuments contains {_id, name, sortId} references; page records
  link to their parent through workshopGroupId.
- Page html is a serialized JSON array of editor blocks (blockId, sortIndex, name,
  dataClean in the default block). The backend currently stores the string without
  validating its structure. pageType defaults to PAGE; the UI also offers EXAM,
  but this service has no assessment execution or scoring workflow.

## Known producer/consumer differences

- Editor sortDocuments is typed as WorkshopDto[]; the service returns WorkshopDto.
  Editor deleteWorkshop expects `{ id }`; the service returns DeleteResultDto.
- Sections are a single wrapper object and Swagger now describes that shape.
  Some workshop Swagger responses still use the Mongoose Workshop schema rather
  than the actual mapped WorkshopDto.
- The editor pins @tmdjr/document-contracts 0.0.22. The service source package says
  0.0.1, while deployment derives the patch from GITHUB_RUN_NUMBER. This is not proof
  of the current published version. Generated artifacts were refreshed during section
  creation work and now use current WorkshopPage/DeletePageParams source names.
  Section CRUD additionally generates and exports UpdateSectionDto and new path
  operations locally; these artifacts have not been published.
  The editor's section request uses the published SectionDto name field and its
  response uses SectionDto, so this feature needs no frontend package upgrade.
- POST /api/documents/uploader/image-upload accepts multipart `image` and the editor
  expects secure_url. No uploader controller/module exists in service-document.
  Its gateway destination and owner remain unverified.

## Compatibility handoff

service-document owns DTO/Swagger/runtime alignment and generated package output.
mfe-user-journey-admin-document-editor owns request mapping, response typing and
UI recovery. The gateway owner must confirm `/api/documents` routing, upload routing
and auth forwarding; the admin shell owns route mounting and identity providers.
For contract changes: agree on runtime shapes, fix producer metadata, generate and
build contracts, review compatibility, publish only in an authorized release, then
update the consumer and verify the full journey. Section creation adds one admin endpoint; deploy it before enabling the editor flow.

Section CRUD adds public GET and Admin PATCH/DELETE /navigation/section/:id while
preserving existing create/list routes. The editor owner must submit only editable
fields, merge confirmed update responses, remove only confirmed deleted sections,
and surface 400/404/409 and persistence failures. Deploy the service first, then
adopt generated contracts in an authorized release and verify through the gateway.

Section description adds sectionDescription to create/update requests and every
section response. Deploy the producer before enabling description writes; older
title-only requests still work. The editor owner must adopt the generated contracts
after authorized publication, map description in create/edit/display flows, use
'' for clearing and verify create/read/list/update through the gateway. No package
version, publication or deployment is implied by local generation.

## Local authentication mode

DocumentAuthGuard wraps the existing AuthenticationGuard. Only explicit non-production
DOCUMENT_LOCAL_DEV mode with the exact document_local URI, a loopback connection and
an approved origin supplies local-document-admin. RolesGuard is unchanged. Standalone
local development needs no live auth service; production and hosted shell auth remain
normal. See development.md for commands and origin restrictions.

## Mixed workshop journey (005, 2026-10-05)

`WorkshopDto.workshopDocuments` is now an ordered union, discriminated by `kind`:

```ts
{ _id: string, kind: 'PAGE', name: string, sortId: number }
{ _id: string, kind: 'ASSESSMENT_TEST', resourceId: string, name: string, sortId: number }
{ _id: string, kind: 'CODING_LAB', resourceId: string, name: string, sortId: number }
```

The PAGE `_id` identifies owned document content. External `_id` identifies this
placement in this workshop; `resourceId` identifies content in its owning service.
External IDs are opaque nonblank strings; identical resources may be referenced
multiple times. `name` is a workshop navigation label, not a remote resource rename.
Array order is canonical; reorder assigns zero-based sortId, while appends choose
one above the current maximum (removal may leave gaps).

Admin `POST /navigation/page/add-reference` accepts:

```json
{
  "workshopId": "<workshop Mongo ID>",
  "kind": "ASSESSMENT_TEST",
  "resourceId": "<frontend-selected assessment ID>",
  "name": "Check your understanding"
}
```

Returns 201 WorkshopDto; kind can also be CODING_LAB. Invalid payloads return 400,
missing workshop 404. No foreign API call, import, remote existence validation or
cross-service cascade occurs. Frontend is responsible for resolving resources and
presenting missing/unavailable resources.

Existing create-page emits PAGE entries. Rename and deletion routes operate on
entry `_id`; external deletion returns `{ acknowledged: true, deletedCount: 1 }`
for the unlinked placement. PAGE deletion returns the owned content deletion result.
Sort-pages accepts the full mixed entry array and query workshopId, validates all
entries, requires each existing ID exactly once and preserves stored metadata.
Unknown/duplicate/incomplete entries return 400, missing workshop 404, concurrent
journey mutation during reorder 409. These POST operations retain runtime 201;
Swagger now describes that status. Public workshop lists use WorkshopDto instead
of the previously empty Workshop schema.

Greenfield breaking changes: required kind, new external resourceId, removal of the
previously ignored workshopDocuments creation input, generated Workshop model
replaced by WorkshopDto responses. No migration is required. Existing stored untyped document references now default
to PAGE; new payloads must include kind.
See [handoff](../specs/005-mixed-workshop-journey/handoff.md) for delivery order.
