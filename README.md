# Workshop document service

NestJS and MongoDB service for Ngx-Workshop sections, workshop metadata, ordered
page references and serialized editor blocks. Navigation/page reads can be public;
mutations declare administrator access through the shared auth guards.

Start with [AGENTS.md](AGENTS.md) for the repository context and working rules.

- [Architecture and data ownership](docs/architecture.md)
- [Development, generation and verification](docs/development.md)
- [HTTP contract map](docs/api-contracts.md)
- [Current gaps and readiness](docs/document-readiness.md)
- [Specification workflow](.specify/README.md), [constitution](.specify/memory/constitution.md)
  and [feature index](specs/README.md)
- [Migration record](docs/seed-adoption.md)

## Development

Use Node 22, npm ci, a reachable test MongoDB and the external authentication service.
Configure MONGODB_URI, AUTH_BASE_URL and optionally PORT (default 3007), then use
npm run start:dev. Compose requires an external ngx-net network and .env; it does
not start MongoDB. See the development guide for existing compiler/test blockers.

## Contracts

Service routes begin /navigation and /workshop; browser consumers use the gateway
prefix /api/documents. The html field stores serialized JSON blocks. Swagger and
TypeScript contracts are generated locally; launch generation with
GENERATE_OPENAPI=true set before module import. Checked-in generated contracts have
known drift and a compilation error documented in the development guide.

The global ValidationPipe validates decorated DTOs; inline bodies and bare arrays
still have validation gaps. Admin decorators do not establish that auth integration
has been tested. The local readiness review distinguishes current code from desired
integrity, validation and compatibility guarantees.
