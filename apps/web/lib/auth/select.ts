import type { AuthProviderKind } from './types.js';

/**
 * Pure provider selection from the environment. WorkOS is active only when its
 * four required vars are present; otherwise the app runs in open demo mode.
 * Kept pure and dependency-free so it is unit-testable and so middleware (edge
 * runtime) can call it without pulling a provider SDK.
 *
 * Adding a provider: extend the union, add an env probe here, and add an
 * implementation selected in ./index.ts.
 */
export function selectAuthProviderKind(
  env: Record<string, string | undefined> = process.env,
): AuthProviderKind {
  const workosConfigured = Boolean(
    env['WORKOS_CLIENT_ID'] &&
    env['WORKOS_API_KEY'] &&
    env['WORKOS_COOKIE_PASSWORD'] &&
    env['NEXT_PUBLIC_WORKOS_REDIRECT_URI'],
  );
  return workosConfigured ? 'workos' : 'demo';
}
