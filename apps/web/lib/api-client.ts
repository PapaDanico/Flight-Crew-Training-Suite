/**
 * Typed fetch client for the @dnca/api Fastify backend.
 *
 * All calls are server-side (Server Components / Route Handlers) — never
 * imported from a Client Component. Auth materials never leak to the
 * browser: the access token comes from the encrypted session cookie
 * (decrypted only on the Node side by withAuth) or from server-only env.
 *
 * Three modes:
 *
 *   - WorkOS-authenticated session → forward access token as Bearer.
 *   - DEMO_OPERATOR_ID env set     → x-demo-operator-id header (dev).
 *   - Neither                       → throw; callers fall back to fixtures.
 *
 * Client does not re-validate response bodies — the API has already
 * Zod-validated outbound shapes against the schemas in
 * apps/api/src/routes/*.ts. If the API contract drifts, the typecheck on
 * shared @dnca/domain types catches it.
 */

import type {
  CurrencyKind,
  IsoDate,
  IsoDateTime,
  Pilot,
  PilotRole,
  TrainingPhase,
} from '@dnca/domain';
import { getApiBaseUrl, getDemoApiConfig } from './api-config.js';
import { getAuthProvider } from './auth/index.js';

export type ApiPilot = Omit<Pilot, 'createdAt' | 'updatedAt'>;

export interface ApiCurrencyRecord {
  readonly id: string;
  readonly operatorId: string;
  readonly pilotId: string;
  readonly kind: CurrencyKind;
  readonly validFrom: IsoDate;
  readonly validTo: IsoDate;
  readonly sourceSessionId: string | null;
  readonly issuedByUserId: string | null;
  readonly notes: string | null;
  readonly supersededAt: IsoDateTime | null;
  readonly supersededBy: string | null;
  readonly createdAt: IsoDateTime;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function buildAuthHeader(): Promise<Record<string, string>> {
  // Prefer the provider's access token when a session is present; otherwise
  // fall back to the demo operator header. Provider-agnostic: the seam in
  // ./auth returns a Bearer token regardless of the underlying IdP.
  const { accessToken } = await getAuthProvider().getSession();
  if (accessToken) {
    return { authorization: `Bearer ${accessToken}` };
  }
  const demo = getDemoApiConfig();
  if (demo) {
    return { 'x-demo-operator-id': demo.demoOperatorId };
  }
  throw new ApiError(
    'API not authenticated. Sign in, or set DEMO_OPERATOR_ID for dev mode.',
    401,
    '',
  );
}

async function apiFetch<T>(path: string): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new ApiError('API not configured (API_BASE_URL unset)', 0, path);
  const url = `${baseUrl}${path}`;
  const authHeaders = await buildAuthHeader();
  const res = await fetch(url, {
    headers: {
      ...authHeaders,
      accept: 'application/json',
    },
    // Server Components are request-scoped; cache: no-store keeps currency
    // data fresh per request without leaking across operator scopes.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new ApiError(`API ${res.status} ${res.statusText}`, res.status, url);
  }
  return (await res.json()) as T;
}

export async function listPilots(): Promise<{ pilots: ApiPilot[]; asOf: string }> {
  return apiFetch<{ pilots: ApiPilot[]; asOf: string }>('/pilots');
}

export async function getPilot(id: string): Promise<ApiPilot> {
  return apiFetch<ApiPilot>(`/pilots/${encodeURIComponent(id)}`);
}

export async function listCurrencyRecords(
  pilotId: string,
): Promise<{ records: ApiCurrencyRecord[] }> {
  return apiFetch<{ records: ApiCurrencyRecord[] }>(
    `/pilots/${encodeURIComponent(pilotId)}/currency-records`,
  );
}

// Re-export the shared role/phase enums so pages can render without an extra
// @dnca/domain import alongside this client.
export type { CurrencyKind, PilotRole, TrainingPhase };
