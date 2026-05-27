import { z } from 'zod';

/**
 * Environment configuration. Validated at server boot — a missing or
 * mis-typed env var fails fast with an actionable error rather than
 * surfacing as a confusing runtime crash mid-request.
 */
const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),

  // WorkOS — required in production, optional in dev (then auth plugin runs
  // in DEMO mode with a synthetic operator).
  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),
  WORKOS_COOKIE_PASSWORD: z.string().min(32).optional(),
  // JWKS URL used to verify WorkOS-issued access tokens. Defaults to the
  // standard AuthKit JWKS endpoint derived from WORKOS_CLIENT_ID; override
  // for self-hosted or custom-domain deployments.
  WORKOS_JWKS_URL: z.string().url().optional(),
  // Expected issuer of WorkOS-signed JWTs. Defaults to https://api.workos.com.
  WORKOS_ISSUER: z.string().url().default('https://api.workos.com'),

  // Anthropic — optional; routes that need it return 503 if unset.
  ANTHROPIC_API_KEY: z.string().optional(),

  // CORS origin allowlist. apps/web's deployed URL in production.
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

export function isProduction(c: Config): boolean {
  return c.NODE_ENV === 'production';
}
