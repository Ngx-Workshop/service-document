# Mixed workshop journey

Status: Implemented; frontend integration pending · 2026-10-05

A workshop author can interleave owned document pages with references to assessment
tests and coding labs selected by the frontend. This service owns navigation only
for external resources; it imports no foreign contracts and calls no foreign APIs.

- FR-001: workshopDocuments is an ordered discriminated union with PAGE,
  ASSESSMENT_TEST and CODING_LAB kinds, an entry _id, navigation name and sortId.
  External entries additionally carry an opaque nonblank string resourceId.
- FR-002: Admin can append an external reference; repeated resource IDs are allowed
  and receive distinct entry IDs. Array order is canonical; appends assign the next
  sortId atomically. Owned pages use their document ID as their entry ID.
- FR-003: Admin can rename, reorder and remove mixed entries. Reorder must include
  every existing entry exactly once, preserves stored labels/types/resource IDs and
  normalizes sortId. Concurrent journey changes cause a conflict, not lost writes.
- FR-004: Removal unlinks external entries without deleting remote resources.
  Workshop cascade targets only owned pages. Foreign/missing entry deletion is 404.
- FR-005: Public workshop lists expose the union; runtime payload validation and
  generated OpenAPI/TypeScript agree. Creation input cannot inject journey entries.

Acceptance: AC-001 mixed references round-trip, including repeated and dollar-prefixed
IDs; AC-002 mixed reorder preserves identity and rejects invalid/foreign/duplicate
entries and conflicts; AC-003 deletion respects resource ownership; AC-004 HTTP
validation and Admin enforcement; AC-005 document creation and rollback regressions.

Greenfield change authorized by user: required kind and removal of the previously
ignored create-workshop workshopDocuments input are breaking contract changes.
No migration, remote existence checks, completion/scoring state or frontend UI in scope.
