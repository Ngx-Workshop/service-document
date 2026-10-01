# Document service development

## Setup

CI and Docker use Node 22. Install locked dependencies with npm ci. Runtime needs
MONGODB_URI and a reachable MongoDB instance; PORT defaults to 3007. Configure
AUTH_BASE_URL for the external auth client/deployment and verify the package's
runtime expectations. Never copy real credentials into documentation.
Use a separate test database for CRUD validation. Compose expects .env and an
external ngx-net network; it does not supply MongoDB or the auth service.

| Command | Purpose / caveat |
| --- | --- |
| npm run start:dev | Runtime watch server; MongoDB/auth configuration required |
| npm run start:prod | node dist/main; build first |
| GENERATE_OPENAPI=true npm run build | Compile then run postbuild OpenAPI generation; current compiler config has a known blocker |
| GENERATE_OPENAPI=true npm run openapi | Generate openapi.json from existing dist; build it from current source first |
| npm run contracts:document:gen | Generate types/models from local openapi.json |
| npm run contracts:document:build | Compile generated package |
| npm test -- --runInBand | Jest unit suite; no src spec files currently exist |
| npm run test:e2e -- --runInBand | Inherited root-route test; not representative of document API |
| ./node_modules/.bin/eslint 'src/**/*.ts' 'test/**/*.ts' | Read-only lint check; npm run lint applies fixes |
| ./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.build.json | Read-only service typecheck |
| ./node_modules/.bin/tsc --noEmit -p contracts/document/tsconfig.build.json | Read-only contract typecheck |

Generation and contracts commands modify tracked artifacts. Review changes and
compatibility before publishing. Install contracts/document dependencies when
needed for its tooling. npm run contracts:document:publish and CI on main publish
a package; they are release actions, not verification steps.

## OpenAPI environment ordering

Set GENERATE_OPENAPI=true in the process environment before starting build/generation.
The assignment inside swagger.ts happens after importing AppModule, while module
DB selection runs during import. The launch-time variable is necessary for reliable
DB-free generation. Never set it on a normal server: models/RemoteAuthGuard are
replaced with generation-only stubs. Do not claim real guard verification in that mode.

## Migration checks — 2026-10-01

- FAIL (existing): service typecheck above exits 2 with TS5023, unknown compiler
  option deleteOutDir in tsconfig.build.json. It is already correctly present as
  a Nest option in nest-cli.json but is invalid in TypeScript compilerOptions.
- FAIL (existing): contract typecheck above exits 2 with TS2307; src/index.ts exports
  ./models/Workshop, which does not exist in the checked-in generated package.
- INVENTORY: ./node_modules/.bin/jest --listTests --runInBand exits 0 and returns no
  tests. This is discovery only, not a passing unit suite.
- Source review: test/app.e2e-spec.ts expects Hello World at /, but AppModule has no
  root controller. It also imports real database/auth modules and lacks production
  pipe setup; it cannot be treated as a document API acceptance test.
- PASS: 37 local documentation links resolve; all four feature templates exist,
  constitution gates are present and plan metadata fields match the legacy parser.
- NOT RUN: dependency installation, build/OpenAPI regeneration, contract publication,
  full tests/lint, MongoDB/auth integration, container build or deployment.

## Next implementation verification

After selecting and fixing a scoped finding, verify DTO validation, auth roles,
missing IDs/parents, cross-workshop access, block round-trip and partial failures.
Use focused mocked service tests plus an isolated MongoDB integration suite for
relationship/cascade behavior. Check public and authenticated requests through the
gateway separately. A TCP startup probe does not establish API correctness.
See [readiness](document-readiness.md) and [HTTP contracts](api-contracts.md).
