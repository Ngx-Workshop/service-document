# Document service architecture

Source baseline: ec50bd0 · Reviewed 2026-10-01.

## Responsibility and stack

NestJS 11 REST service for sections, workshop metadata, ordered page references
and serialized page blocks. Mongoose 8 persists data in MongoDB. The service uses
class-validator/class-transformer, Swagger and @tmdjr/ngx-auth-client 0.0.21.
TypeScript is ~5.7.3 with strictNullChecks but noImplicitAny disabled.

## Source map

| Area | Local source | Responsibility |
| --- | --- | --- |
| Runtime | src/main.ts | Cookie parser, global validation, port 3007 default |
| Composition | src/app.module.ts | Global config, Mongo connection and feature modules |
| Navigation | src/navigation/navigation.controller.ts, navigation.service.ts | Sections and workshop/page reference CRUD/sort |
| Metadata | src/navigation/dto/, schemas/ | Request/response DTOs, Section and Workshop schemas |
| Page content | src/workshop-page/workshop-page.controller.ts, workshop-page.service.ts | Page reads, content saves and persistence helpers |
| Page schema | src/workshop-page/dto/, schemas/ | Page payloads and JSON block defaults |
| Auth wiring | Feature module files | Global AuthenticationGuard/RolesGuard and generation-only providers |
| Contracts | src/swagger.ts, openapi.json, contracts/document/ | Schema generation and publishable types |
| Operations | Dockerfile, docker-compose.yml, .github/workflows/deploy.yml | Build, contract publication and deployment |

## Data and operations

Section stores sectionTitle, numeric summary, icon paths and categoriesLastUpdated.
Its schema declares _id as ObjectId. No section creation/update controller is exposed.
Workshop stores sectionId, slug, metadata, sortId, embedded workshopDocuments and
workshopDocumentsLastUpdated. A pre-save hook creates the name-derived slug; rename
sets it explicitly. No uniqueness declaration protects this slug.
WorkshopPage stores parent workshopGroupId, name, sortId, pageType, lastUpdated and
html. Defaults create a Page with one header block stored as JSON text.

Creating a workshop creates its first page and then writes the reference. Creating
another page creates a record before updating the parent. These are separate writes
without a transaction. Page rename and reorder update only embedded references;
content save updates only html, without refreshing lastUpdated. Deletion updates
parent references and page records separately. The readiness review records the
consequences and verification needs rather than claiming atomicity.

## API, authentication and validation

See [HTTP contracts](api-contracts.md). Both modules register global auth/role
guards. Sections, workshop lists and individual page reads explicitly allow public
access; writes require Admin. Health is not explicitly public. The listing of all
pages also applies RemoteAuthGuard. External auth integration is not verified here.

ValidationPipe uses whitelist and forbidNonWhitelisted, but that does not validate
inline object bodies or array elements automatically. Transformation is not globally
enabled. IDs and relationship checks are uneven across operations.

## Generation and release

GENERATE_OPENAPI=true skips Mongo imports and supplies fake models/RemoteAuthGuard
for schema generation. It must be set before importing AppModule; swagger.ts sets it
after its static import, so launch-time configuration is necessary. Do not use this
mode to serve traffic or as evidence of real authorization/persistence.
Deployment generates OpenAPI, generates/builds/publishes contracts with a CI run
number patch version, then deploys the container. Its startup check is a TCP probe,
not a complete document or authorization check. No release was run in this migration.
