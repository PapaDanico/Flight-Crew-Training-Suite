import { selectAuthProviderKind } from './select.js';
import { workosProvider } from './workos-provider.js';
import { demoProvider } from './demo-provider.js';
import type { AuthProvider } from './types.js';

export type { AuthProvider, AuthProviderKind, AuthSession, AuthUser } from './types.js';
export { selectAuthProviderKind } from './select.js';

/**
 * The active auth provider for this deployment, chosen from the environment.
 * Consumers (pages, the API client, route handlers) depend only on this.
 */
export function getAuthProvider(): AuthProvider {
  switch (selectAuthProviderKind()) {
    case 'workos':
      return workosProvider;
    case 'demo':
    default:
      return demoProvider;
  }
}
