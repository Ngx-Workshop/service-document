# Document service development

## Local document workflow (2026-10-03)

This mirrors the assessment repositories, using document-specific ports and data.
Prerequisite: MongoDB listening on 127.0.0.1:27017. After npm ci in each repository,
run these commands in separate terminals:

```bash
# service-document
npm run start:local
```

```bash
# mfe-user-journey-admin-document-editor
npm run dev:bundle
```

Open the MFE Orchestrator at https://admin.ngx-workshop.io/list-mfe-remotes. For the
document editor, open the code-icon Dev Mode Options, enable Dev Mode, and set
Remote Entry Point to http://localhost:4202/remoteEntry.js. Then open
https://admin.ngx-workshop.io/document-editor and reload after changes. The override
applies only to your browser; the global registry is unchanged. The document API is http://localhost:3007; data is stored
only in mongodb://127.0.0.1:27017/document_local. Port 4202 avoids the assessment
remote on 4201. This database starts empty; use Create Section, then Create New
Workshop. No production records are copied or required.

The local service sets DOCUMENT_LOCAL_DEV=true and NODE_ENV=development, overrides
MONGODB_URI/PORT, binds only to loopback and supplies local-document-admin. It rejects
other database URIs, non-loopback peers and unapproved origins. CORS allows
https://admin.ngx-workshop.io, http://localhost:4202 and http://127.0.0.1:4202.
Production mode and normal start:dev retain the platform authentication guard and
public-route metadata. Do not tunnel or reverse-proxy local auth mode.

The signed-in hosted shell owns routing and authentication. The root App remains
empty and the exported Routes retain userAuthenticatedGuard. Development bundles
use environment.development.ts for localhost:3007; production bundles use
/api/documents. Port 4202 serves assets, not a standalone editor.
Build production into a separate folder while the bundle watcher runs:
npm run build -- --output-path /tmp/document-editor-production-check.

All navigation, content, mutation and upload requests use the environment API base.
The service has no uploader endpoint: image URL entry works, local file uploads
require the external uploader and are outside this setup.

Verified: 29 service tests, 8 browser unit/component tests, production builds,
production API URL isolation and live browser/HTTP checks against local MongoDB.
See [local setup handoff](../specs/002-local-development/handoff.md) for scope and limits.

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
| GENERATE_OPENAPI=true npm run build | Compile then run postbuild OpenAPI generation; Nest build passes (direct tsc config issue remains) |
| GENERATE_OPENAPI=true npm run openapi | Generate openapi.json from existing dist; build it from current source first |
| npm run contracts:document:gen | Generate types/models from local openapi.json |
| npm run contracts:document:build | Compile generated package |
| npm test -- --runInBand | Jest suite; section creation HTTP/guard/validation checks |
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

## Section creation verification — 2026-10-03

Both production builds, service OpenAPI/contract generation and contract compilation
pass. Service tests: 15 passing; editor ChromeHeadless tests: 6 passing. Service tests
mock persistence and remote identity while exercising real validation/schema defaults
and role enforcement. Editor tests mock HTTP. No live database, auth or gateway test
was performed. See [feature handoff](../specs/001-create-sections/handoff.md).
Earlier migration results above are historical; generated-contract compilation now
passes, while the direct TypeScript deleteOutDir configuration issue remains separate
from the successful Nest production build.
