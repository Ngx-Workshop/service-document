# Service logging and heartbeat

This service uses native NestJS 11 `ConsoleLogger` JSON output to stdout/stderr, with `Logger` context for application events. No Angular logger or application-held Grafana credential is used. HTTP logs contain generated request ID, method, route template, status and duration; bodies, cookies, authorization headers, concrete identifiers and query strings are not logged by the middleware. Health polling is excluded from access logs. Avoid embedding secrets or personal search text in domain log messages.

`GET /health` and HEAD return the anonymous operational Terminus heartbeat with `status: ok` and `heartbeat: up`, plus `Cache-Control: no-store`. This is liveness only; it does not claim MongoDB or upstream readiness. Existing business-route authentication remains enforced. The gateway's exact read-only heartbeat is the only exception to its normalized proxy-envelope requirement. The operational endpoint is excluded from business Swagger/contracts where that service generates them.

Docker probes `/health` every 30 seconds. Deployments bound each container's local JSON log files to 10 MiB × 3. Host Alloy discovers active service names and ships logs and private HTTP heartbeat probe metrics to Grafana Cloud stack `ivorytoffee195`. Collector configuration/dashboard lives in infrastructure owner `nginx-ngx-workshop.io/ops/grafana`; its ingestion token remains host-owned, scoped to logs/metrics write, and requires account authorization before activation. No production credential belongs in this repository.

Validation on 2026-11-21: the isolated observability HTTP suite passed (5 scenarios), build passed, Linux-targeted lockfile dry run passed. Guarded services additionally passed the anonymous-heartbeat/protected-business-route HTTP test. Gateway production ingress e2e passed (51 scenarios), including exact-path/method heartbeat boundaries. Gateway and publisher lint passed. Full existing unit suites passed except Backstage's unchanged Octokit ESM test-loader failure, reproduced on its pre-change HEAD. Uploader tests pass under its documented `npm test` command; its 10 optional cases remain skipped. Publisher persistence e2e cases require the isolated Mongo URI and remain skipped when unavailable. These are local checks, not evidence of Grafana ingestion or live deployment.

## Document domain outcomes - 2026-11-22

Native contextual Logger events now cover `page_content_saved` in
WorkshopDocumentService and `navigation_page_created`,
`navigation_reference_added`, `navigation_journey_reordered` in NavigationService.
Each use case emits one outcome, not one record per persisted item:
`succeeded` (log), HTTP rejection `rejected` (warn), unexpected/server failure
`failed` (error). Payloads contain only the event, generated operationId,
durationMs, optional generated requestId and failure statusCode.
Names, Mongo/resource IDs, content, incoming headers and raw errors are never
copied into these payloads. Page-create compensation finishes before its outcome;
compensation/write semantics are unchanged.

Request AsyncLocalStorage propagates the existing middleware-generated UUID
across awaited work and isolates concurrent requests. Incoming X-Request-ID is
always ignored/replaced, even if syntactically valid; no caller identifier is
trusted or forwarded to upstream services. A standalone operation gets only its
own operationId. This is local correlation, not distributed tracing. Detached
async work spawned inside a request can inherit its context; no background worker
is introduced here and callers must define a separate run context if one is added.
Health GET/HEAD still skip both context creation and access logging.

Instrumented controller methods use DomainExceptionFilter to preserve Nest's
existing HTTP error bodies/statuses without the default raw exception dump.
Services still rethrow the original error after their safe outcome log. An HTTP
access record and a domain outcome represent different boundaries, not duplicate
domain failures. Uninstrumented routes retain their existing error handling;
this is not a claim that every historical application log is redacted.

Verified native JSON placement (outer `level` and `context`, nested `message`):

```json
{
  "level": "error",
  "context": "WorkshopDocumentService",
  "message": {
    "event": "page_content_saved",
    "operationId": "8b5ae35c-a27c-4a72-8e92-21b30e09ea12",
    "requestId": "727369b5-f35d-4e19-8be2-836fbe65c2c0",
    "durationMs": 12,
    "outcome": "failed",
    "statusCode": 500
  }
}
```

Nest also supplies its normal timestamp/process fields. Existing collector
transport and stream labels are unchanged. Example LogQL (infrastructure owner
must confirm the existing `service_name` selector):

```logql
{service_name="document"} | json event="message.event", outcome="message.outcome", requestId="message.requestId" | event="page_content_saved" | outcome="failed"
```

Filter/extract requestId/operationId at query time; never promote them to Loki
stream labels. Five new JSON/HTTP tests verify interleaved request isolation,
standalone context, success/rejection/storage failures, original service errors,
canary redaction, exact generic HTTP 500 shape and quiet GET/HEAD health polls.
Journey tests additionally verify safe reference/reorder/compensation outcomes.
All existing access and heartbeat authorization tests remain passing.

Live receipt remains pending: infrastructure owner
`Ngx-Workshop/nginx-ngx-workshop.io`, `ops/grafana`, must authorize the host-owned
collector, then inspect a controlled document success/failure and matching access
record in stack `ivorytoffee195`. Confirm field extraction and heartbeat silence.
No app credential, collector replacement, Grafana SDK or deployment was added.
