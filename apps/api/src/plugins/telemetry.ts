import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { Principal } from './auth.js';

/**
 * Observability plugin — structured, correlated, tenant-tagged access logging
 * (CLAUDE.md §"Errors and observability": structured logging to stdout with
 * correlation IDs propagated).
 *
 * - Every response emits one access-log line carrying the request id, the
 *   resolved tenant (operator_id) and actor (user/role/source), the route, the
 *   status and the duration — so an ops dashboard can slice by operator without
 *   touching request bodies.
 * - The request id is echoed in the `x-request-id` response header and honoured
 *   from an inbound `x-request-id` (see server.ts genReqId), so a trace id flows
 *   web → api → logs.
 * - Distributed tracing (OTLP) is a config seam: when OTEL_EXPORTER_OTLP_ENDPOINT
 *   is set, a future exporter ships spans there; the access log is the
 *   always-on floor that needs no collector.
 */

export interface AccessLogFields {
  reqId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  operatorId: string | null;
  actorUserId: string | null;
  actorRoles: string | null;
  authSource: string | null;
}

/**
 * Pure: shape one access-log record. `route` should be the matched route
 * pattern (low cardinality) rather than the raw URL where available.
 */
export function buildAccessLogFields(input: {
  reqId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  principal?: Pick<Principal, 'operatorId' | 'userId' | 'roles' | 'source'> | undefined;
}): AccessLogFields {
  const p = input.principal;
  return {
    reqId: input.reqId,
    method: input.method,
    route: input.route,
    statusCode: input.statusCode,
    durationMs: Math.round(input.durationMs * 1000) / 1000,
    operatorId: p?.operatorId ?? null,
    actorUserId: p?.userId ?? null,
    actorRoles: p && p.roles.length > 0 ? p.roles.join(',') : null,
    authSource: p?.source ?? null,
  };
}

const telemetryPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onSend', async (request, reply, payload) => {
    void reply.header('x-request-id', request.id);
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    const fields = buildAccessLogFields({
      reqId: request.id,
      method: request.method,
      route: request.routeOptions?.url ?? request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
      // principal is set by the auth plugin; absent on auth:'none' routes.
      principal: (request as { principal?: Principal }).principal,
    });
    request.log.info(fields, 'access');
  });
};

export default fp(telemetryPlugin, { name: 'telemetry' });
