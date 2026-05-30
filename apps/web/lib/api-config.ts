/**
 * Web → API wiring configuration.
 *
 * Three running modes, decided per-request:
 *
 *   1. workos     — WORKOS_* env set AND the user has a valid session.
 *                   The web forwards the user's access token to the API
 *                   as Bearer; the API verifies it and resolves the
 *                   operator scope from the JWT's org_id claim.
 *
 *   2. demo       — API_BASE_URL + DEMO_OPERATOR_ID set, no WorkOS.
 *                   Web sends the legacy x-demo-operator-id header.
 *                   Useful for local dev, integration tests, and
 *                   environments without a WorkOS project yet.
 *
 *   3. fixtures   — neither configured. Pages render from @dnca/domain
 *                   fixtures so design work, CI, and Vercel preview
 *                   builds without a backend still produce a usable UI.
 *
 * The page surfaces a source badge so a viewer always knows which mode
 * is active — no silent degradation.
 */

export interface DemoApiConfig {
  readonly baseUrl: string;
  readonly demoOperatorId: string;
}

export function getDemoApiConfig(): DemoApiConfig | null {
  const baseUrl = process.env['API_BASE_URL']?.replace(/\/+$/, '');
  const demoOperatorId = process.env['DEMO_OPERATOR_ID'];
  if (!baseUrl) return null;
  if (!demoOperatorId) return null;
  return { baseUrl, demoOperatorId };
}

export function getApiBaseUrl(): string | null {
  return process.env['API_BASE_URL']?.replace(/\/+$/, '') ?? null;
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== null;
}

// Provider selection moved to lib/auth/select.ts (selectAuthProviderKind) so
// the app has a single, provider-agnostic source of truth for which IdP is
// active. This module now only configures the web → API transport.
