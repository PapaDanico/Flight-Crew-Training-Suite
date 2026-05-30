# Observability

What the platform emits today, and the seams for the hosted stack (ADR: OpenTelemetry → Grafana Cloud / Datadog).

## Always-on (no collector required)

- **Structured logs to stdout (JSON in production).** The API logs via `pino`; in
  production every line is JSON suitable for shipping by the platform's log driver.
- **Correlation IDs.** Every request has an id. The API honours an inbound
  `x-request-id` (when it matches `^[A-Za-z0-9._-]{8,128}$`) so a trace flows
  `web → api → logs`; otherwise it mints a UUID. The id is echoed in the
  `x-request-id` response header.
- **Access log per response.** `apps/api/src/plugins/telemetry.ts` emits one
  `access` line per request carrying:

  | field                                     | meaning                                                                |
  | ----------------------------------------- | ---------------------------------------------------------------------- |
  | `reqId`                                   | correlation id                                                         |
  | `method`, `route`                         | HTTP verb + matched route pattern (low cardinality)                    |
  | `statusCode`, `durationMs`                | outcome + latency                                                      |
  | `operatorId`                              | resolved tenant — slice dashboards by operator without touching bodies |
  | `actorUserId`, `actorRoles`, `authSource` | who acted, with which roles, via workos/demo                           |

  Tenant/actor fields are `null` on `auth:'none'` routes (e.g. `/health`) and for a
  platform-admin acting cross-tenant.

- **Non-leaky errors.** The error handler returns `invalid_input` / `http_error` /
  `internal_error` shapes; stack traces go to logs only, never to the client.

## Boot signal

On start the API logs `telemetry_configured` with `serviceName`, `otlpEndpoint`
(from `OTEL_EXPORTER_OTLP_ENDPOINT`) and `tracesExport` (`otlp` when an endpoint is
set, else `disabled`).

## Config

| env                           | default    | purpose                                                               |
| ----------------------------- | ---------- | --------------------------------------------------------------------- |
| `LOG_LEVEL`                   | `info`     | pino level                                                            |
| `SERVICE_NAME`                | `dnca-api` | tags logs; will tag spans                                             |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset)_  | OTLP collector; when set, the future trace/metric exporter ships here |

## Seam to distributed tracing

The access log is the always-on floor. Distributed tracing is a config seam: when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set, an OpenTelemetry SDK exporter (added with the
hosted deployment) ships spans there, reusing the same `reqId` as the trace id and
`SERVICE_NAME` as the service resource. No collector is required for the access-log
floor, so local dev and fixtures-mode deployments stay zero-dependency.
