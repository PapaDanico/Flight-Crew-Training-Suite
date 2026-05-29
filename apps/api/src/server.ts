import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { ZodError } from 'zod';
import { createDatabase } from '@dnca/db';
import { loadConfig, isProduction, assertAuthModeSafe } from './config.js';
import authPlugin from './plugins/auth.js';
import tenantPlugin from './plugins/tenant.js';
import auditPlugin from './plugins/audit.js';
import telemetryPlugin from './plugins/telemetry.js';
import zodValidatorPlugin from './plugins/zod-validator.js';
import { healthRoutes } from './routes/health.js';
import { pilotRoutes } from './routes/pilots.js';
import { currencyRoutes } from './routes/currency.js';
import { sessionRoutes } from './routes/sessions.js';

/**
 * Fastify server bootstrap. Wired plugins in dependency order:
 *   1. sensible (httpErrors helper)
 *   2. helmet (security headers)
 *   3. cors (allowlist from env)
 *   4. rate-limit (global + per-route)
 *   5. auth (Principal on every request)
 *   6. tenant (Postgres RLS scoping)
 *   7. audit (AuditEvent emission helper)
 *
 * Then routes.
 */
export async function buildApp() {
  const config = loadConfig();

  // Fail closed: refuse to boot in an auth configuration that would fail open
  // (e.g. demo auth in production, or WorkOS creds present but demo selected).
  // This supersedes the earlier NODE_ENV-only guard from PR #4 — assertAuthModeSafe
  // covers that case (WorkOS creds present but mode would be demo) and more.
  const authMode = assertAuthModeSafe(config);

  const loggerConfig = isProduction(config)
    ? { level: config.LOG_LEVEL }
    : {
        level: config.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'SYS:standard', singleLine: true },
        },
      };

  const app = Fastify({
    logger: loggerConfig,
    // Honour an inbound correlation id (web → api) when it is a safe token,
    // otherwise mint one. Bounds + charset prevent log-forging via the header.
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      if (typeof incoming === 'string' && /^[A-Za-z0-9._-]{8,128}$/.test(incoming)) {
        return incoming;
      }
      return crypto.randomUUID();
    },
  });

  app.log.info({ authMode, nodeEnv: config.NODE_ENV }, 'auth_mode_resolved');
  app.log.info(
    {
      serviceName: config.SERVICE_NAME,
      otlpEndpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT ?? null,
      tracesExport: config.OTEL_EXPORTER_OTLP_ENDPOINT ? 'otlp' : 'disabled',
    },
    'telemetry_configured',
  );

  // Top-level error handling — Zod errors → 400, everything else → 500.
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ZodError) {
      void reply.status(400).send({
        error: 'invalid_input',
        message: 'Request failed schema validation',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    const e = err as { statusCode?: number; name?: string; message?: string };
    if (typeof e.statusCode === 'number') {
      void reply.status(e.statusCode).send({
        error: e.name ?? 'http_error',
        message: e.message ?? 'Request failed',
      });
      return;
    }
    request.log.error({ err }, 'unhandled_error');
    void reply.status(500).send({ error: 'internal_error', message: 'Unexpected server error' });
  });

  await app.register(zodValidatorPlugin);
  await app.register(sensible);
  await app.register(telemetryPlugin);
  await app.register(helmet);
  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()),
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    skipOnError: false,
  });

  const { db, close: closeDb } = createDatabase({ connectionString: config.DATABASE_URL });

  await app.register(authPlugin, { config, db });
  await app.register(tenantPlugin, { db });
  await app.register(auditPlugin);

  await app.register(healthRoutes);
  await app.register(pilotRoutes);
  await app.register(currencyRoutes);
  await app.register(sessionRoutes);

  app.addHook('onClose', async () => {
    await closeDb();
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    const config = loadConfig();
    await app.listen({ host: config.HOST, port: config.PORT });
    app.log.info(`API listening on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    console.error('Failed to start API:', err);
    process.exit(1);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  void start();
}
