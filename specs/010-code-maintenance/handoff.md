# Handoff: Code Maintenance

Status: Implemented and locally verified; integration pending · 2026-11-22
[Spec](spec.md) · [Plan](plan.md) · [Tasks](tasks.md) · [Audit](audit.md)

## Delivered

- Navigation imports the page domain instead of duplicating its model/service.
  WorkshopModule exports only WorkshopDocumentService. DocumentAuthModule
  registers global auth/role guards once and exports no internals. The redundant
  page-list guard is removed; listing remains protected.
- One private page-update helper retains rename before-images, content-save
  after-images, duplicate-key errors and storage-failure identity. Hydrated page
  types remove the cross-domain cast; schemas, timestamps, IDs and block JSON
  remain unchanged. Invalid TypeScript deleteOutDir is removed; Nest retains it.
- Pinned Husky/lint-staged, staged-only Prettier, a self-contained guarded prepare,
  explicit ignores, read-only gates and PR/main checks. Publication now checks
  format/lint/tests first. No unrelated source formatting rewrite.
- Four safe contextual domain outcomes, generated UUID request/operation
  correlation across awaited work, and instrumented-route exception filtering.
  The latter preserves HTTP bodies/statuses without duplicating raw error dumps.
  HTTP logging, health silence, access policy and collector transport are retained.
- Architecture/development/observability documentation and task evidence updated.
  Pre-existing entry-point/prompt/spec changes were integrated, not discarded.

## Verified locally

- `npm test -- --runInBand`: 176 tests / ten suites; 17 new focused regressions.
  Ten persistence/module HTTP characterization cases passed before the refactor.
  HTTP identity/persistence use doubles; native JSON logs are captured and parsed.
- `npm run test:maintenance`: six passing disposable fixtures: actual hook
  commits, partial staging/unrelated edits, syntax-failure rollback, non-mutating
  format/lint rejection, and clean offline developer/CI/no-Git/package-only/
  production-no-dev installations. Fixture directories/stashes are cleaned up.
- `GENERATE_OPENAPI=true npm run build` and direct service TypeScript check pass.
  `git diff --exit-code -- openapi.json` passes: exact generated API unchanged.
  No contract package generation/publication or consumer change required.
- `npm run lint:check` passes with 13 explicit inherited error suppressions and
  14 visible warnings. Baseline was generated only for four untouched files;
  new runtime/tests have no suppressions. Counts are not line-specific, so future
  work must not replenish them to hide new errors. Raw baseline had 34 errors.
- `npm run format:check` passes for supported source/config/tooling. Historical
  Markdown and existing Compose drift are explicitly excluded.
- `npm run test:journey:mongo` passes against real isolated loopback MongoDB,
  including concurrent appends, canonical mixed reorder/revision conflict and
  owned-page cascade. Only its unique fixture database is dropped.
- Linux-targeted locked dependency dry run passes.

Final verification repeated the full Jest suite twice (176 each) and the six
maintenance fixtures; build/types/lint/format, unchanged OpenAPI, whitespace
checks and 76 local documentation links all passed.

See [audit](audit.md#final-local-evidence) for intermediate failures, including
one transient unexpected 404 in an unchanged section test followed by a passing
full rerun, and installation audit warnings. Do not represent these as confirmed
pre-existing defects or silently remediate them outside scope.

## Pending checks and exact ownership

1. **Repository reviewer/release owner:** run checks on the existing Node 22 CI
   target and, with a working Docker daemon, build the existing Dockerfile and
   verify `/health`/document routes with authorized isolated runtime configuration.
   Local installs ran on macOS/Node 24.9.0; actual Docker execution was blocked
   by an unavailable daemon. No remote GitHub workflow was executed.
2. **Infrastructure owner, Ngx-Workshop/nginx-ngx-workshop.io, ops/grafana:**
   authorize the existing host-owned Alloy ingestion credential. In Grafana
   stack `ivorytoffee195`, confirm document stream labels and nested
   `message.event/requestId/outcome` extraction. Check one controlled success/
   failure and its access record, plus quiet heartbeat polling. IDs must remain
   query fields, not Loki labels. No application token/SDK or collector change
   is requested.
3. **Auth/gateway owners:** hosted integration remains outside local doubles.
   Confirm unchanged anonymous reads/heartbeat and admin mutation policy through
   the gateway after an independently authorized release.

Production-no-dev install success is not production startup certification:
the pre-existing auth runtime dependency remains in devDependencies. Historical
transaction/validation/timestamp/name synchronization findings are unchanged.
No migration, upstream protocol update, generated contract delivery, publication,
commit, push or deployment was performed or authorized.

## Next action

Review these local changes and the explicit lint baseline, then run the pending
Node 22/Docker and infrastructure checks when their prerequisites are available.
Older unfinished feature handoffs retain their original status.
