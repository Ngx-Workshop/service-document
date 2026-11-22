# Code Maintenance audit

Date: 2026-11-22. Source: `ef775d5`. Local Node v24.9.0, npm 11.6.0,
ESLint 9.30.0, Prettier 3.6.2; Docker/CI target Node 22.

## T001 baseline

- `git status --short`: existing edits to AGENTS.md/specs/README.md and untracked
  Copilot instructions, prompts and this feature folder. Preserve these inputs.
- `npm test -- --runInBand`: PASS, 159 tests / seven suites.
- `GENERATE_OPENAPI=true npm run build`: PASS; generated OpenAPI unchanged.
- `./node_modules/.bin/eslint 'src/**/*.ts' 'test/**/*.ts'`: FAIL,
  34 errors / 16 warnings. Generation stubs account for 16 require-await errors;
  others are existing test harnesses, bootstrap, page persistence and swagger.
- `./node_modules/.bin/prettier --check 'src/**/*.ts' 'test/**/*.ts'`: PASS.
- `./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.build.json`:
  FAIL, TS5023 (`deleteOutDir` is a Nest option, not a TS compiler option).
- No live auth, gateway or Grafana check. Do not read runtime .env or use
  production credentials. Disposable fixtures only.

## T002 ownership and findings

| Priority | Source evidence | Decision |
| --- | --- | --- |
| P1 | navigation.module.ts registers WorkshopDocumentService and WorkshopPage model again alongside workshop-page.module.ts | Import WorkshopModule and export only its persistence service. Navigation owns Section/Workshop models; pages own WorkshopPage. |
| P1 | Both feature modules register APP_GUARD twice; generation stubs repeat RemoteAuthGuard in Navigation | Introduce one local DocumentAuthModule for global guards, with no exports. Remove the redundant listing guard while retaining global protection. Auth client owns its HTTP adapter; remove redundant HttpModule imports and generation guard stubs. Generation never serves traffic. |
| P1 | observability.ts generates access IDs only; NavigationService has an unused context-free Logger; no page-save or journey outcome logs | Add request AsyncLocalStorage and a bounded outcome helper for page saves and navigation page/reference/reorder operations. No nested persistence/error events or raw errors. |
| P2 | WorkshopDocumentService updateWorkshopName/updateWorkshopHtml duplicate duplicate-key handling and use untyped caught errors; page ID parameter is any | Extract one private update helper with unknown-error guard and string IDs; retain before/after responses, error text and writes. |
| P2 | tsconfig.build.json includes deleteOutDir despite nest-cli.json already owning it | Remove invalid compiler option as part of reliable maintenance checks. |
| P2 | No hooks, read-only format/lint scripts or PR validation workflow | Pinned Husky/lint-staged, self-contained guarded prepare, staged formatting and PR/main checks. Explicit ESLint bulk suppression baseline for remaining inherited errors; no rule weakening. |

Dependency flow after refactor: AppModule -> NavigationModule -> WorkshopModule;
AppModule/WorkshopModule -> DocumentAuthModule -> NgxAuthClientModule -> HTTP
adapter. AppModule -> ObservabilityModule -> Terminus. NavigationService ->
Section/Workshop models and WorkshopDocumentService -> WorkshopPage model. No
cycles, forwardRef, global domain modules or service locators.

Controllers already delegate business work. Keep route decorators, transport
validation and return shapes; only annotate the existing page read ID. Navigation
coordinates cross-document journey mutations; file size alone does not justify
splitting it. DTO/class validation and mixed-reference permutation/revision
checks remain in place. Auth local mode remains loopback/database/origin guarded.
Mongo config, HTTP adapter protocol and Promise lifecycles are unchanged.

Deferred findings: inline bodies/array validation, cross-document transactions,
name/order synchronization, save timestamps, workshop slug uniqueness, and the
auth client's devDependency/runtime packaging. These require separate behavior
or deployment work; a successful production install is not proof the existing
production application runs without devDependencies.

## Compatibility and constitution

Preserve document ownership, routes, metadata, DTOs, schemas, string/Mongo IDs,
JSON block text, access decisions, errors and partial-write/compensation order.
Characterize page persistence and actual module/guard HTTP wiring before moving
providers. Reuse existing journey/section regressions for invalid input,
authorization, conflict and storage failure coverage. New logging records only
stable event/outcome/status/duration and generated request/operation UUIDs; no
resource IDs or payload-derived metadata. Incoming request IDs remain untrusted
and are replaced, not propagated. No constitution deviation or consumer change.

## Implementation sequence

T003 boundary tests -> T004 module/update-helper refactor -> T005 pinned hooks
and ignore policy -> T006 disposable hook/install and CI checks -> T007 scoped
domain instrumentation -> T008 JSON/redaction/context tests -> T009 full checks
-> T010 documentation/handoff. Do not publish or deploy.

T003: ten new page persistence/module HTTP tests passed before refactoring.
T004 initially exposed Nest's separate construction of a route-level guard in
WorkshopModule. Removed the redundant listing guard decorator rather than
re-exporting auth internals: global authentication still protects the list.
Tests assert anonymous listing denial and one remote check on an admin save.

## Final local evidence

| Check | Actual result |
| --- | --- |
| `npm test -- --runInBand` | PASS: 176 tests / ten suites (159 baseline + 17 focused cases). Covers actual module/guard HTTP wiring with isolated persistence/identity, page before/after images and block text, failures, native JSON redaction/context and existing section/journey regressions. |
| `npm run test:maintenance` | PASS: six Node test cases. Real disposable Git commits verify partial staging, unrelated unstaged edits, failure rollback and no leftover stashes; negative format/lint gates are non-mutating; four clean offline npm ci modes pass. Fixtures are removed by test cleanup. |
| `npm ci` | PASS: developer hooks installed in this checkout; locked Husky 9.1.7/lint-staged 16.2.7. |
| `GENERATE_OPENAPI=true npm run build` | PASS: generation DI resolves without DB. |
| `./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.build.json` | PASS: invalid compiler option removed; Nest still owns deleteOutDir. |
| `git diff --exit-code -- openapi.json` | PASS: exact generated API unchanged. No contract regeneration/publication needed. |
| `npm run lint:check` | PASS with explicit ESLint-generated bulk baseline: 13 inherited errors in four untouched files; 14 warnings remain visible. New source/tests have no suppressions. 21 original errors were removed with the coupled refactor. |
| `npm run format:check` | PASS; supported source/config/tooling only. Existing Compose drift and historical prose explicitly excluded. No blanket source rewrite. |
| `npm run test:journey:mongo` | PASS against real loopback MongoDB: mixed round-trip, eight concurrent appends, opaque/repeated IDs, compare-and-set conflict, rename/unlink, page append and owned-page cascade. The script drops only its unique document_journey_check_* fixture DB. |
| `npm ci --dry-run --ignore-scripts --os=linux --cpu=x64 --no-audit --no-fund` | PASS: Linux-targeted lock resolution; not actual Linux execution. |
| `docker version --format '{{.Server.Version}}'` | BLOCKED: Docker daemon unavailable. Package-only/no-Git install is verified, not a built/running image. |

Install fixtures run on macOS/Node 24.9.0, not the Node 22 CI/container target.
CI is configured but has not been run remotely. Existing inherited root e2e
is intentionally not used as document acceptance (real DB/auth config and absent
root route). No external auth/gateway/Grafana or deployment verification.

Observed intermediate failures, not hidden: first module refactor exposed
route-guard DI (fixed and regression-tested); initial ALS edit was caught by
TypeScript (fixed); new Jest asymmetric matchers needed the existing test
unknown-cast convention for lint (fixed). Running a build concurrently with
dependency restoration briefly reported missing tslib; subsequent serialized
builds passed. One intermediate full Jest run returned an unexpected 404 for
the unchanged section name-length test; the next full run passed. This transient
is not claimed to be a confirmed baseline defect. npm installation reported
56 dependency audit findings; no unrelated upgrades/audit-fix were performed.

Final post-change verification passed two consecutive full Jest runs (176 each),
the six maintenance fixtures, build, direct typecheck, baselined lint, formatting,
exact unchanged OpenAPI and `git diff --check`. All 76 local links in affected
context/feature documents resolve. No commit/push/publication/deployment occurred.

## Acceptance and remaining ownership

AC-001–004 have local source-backed/regression/fixture evidence. AC-005 retains
explicit platform/integration limits. Domain filters apply only to instrumented
methods, preserve existing HTTP bodies/statuses and prevent the default logger
from dumping raw errors after the safe domain outcome. Request UUIDs are always
generated locally; incoming IDs are ignored rather than trusted/forwarded.
No data migration, new transaction semantics, access change or consumer delivery
is required. Constitution principles remain satisfied without exception.

Infrastructure owner must authorize/verify existing Alloy -> Grafana ingestion,
its stream selector and nested message extraction; release owner must run the
Node 22 checks and real Docker build when available. Those checks do not authorize
publication/deployment. Historical feature handoffs remain unchanged.
