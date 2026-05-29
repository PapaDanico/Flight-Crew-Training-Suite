/**
 * Provider-agnostic auth seam.
 *
 * The app talks to this interface, never to a specific IdP SDK. Swapping
 * WorkOS for Cognito / ZITADEL / Supabase Auth / Keycloak means adding one
 * implementation file and selecting it — no change to pages, the API client,
 * or the sign-in flow. All methods are server-side (they touch httpOnly
 * cookies); never import a provider from a Client Component.
 */

export type AuthProviderKind = 'workos' | 'demo';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthSession {
  /** The signed-in user, or null when there is no session. */
  user: AuthUser | null;
  /** Bearer token to forward to the API, or null in demo/unauthenticated. */
  accessToken: string | null;
}

export interface AuthProvider {
  readonly kind: AuthProviderKind;
  /** Whether this provider performs real sign-in (false for demo/open mode). */
  readonly isInteractive: boolean;
  /** Resolve the current request's session. Must not throw outside a request. */
  getSession(): Promise<AuthSession>;
  /** URL that begins the sign-in flow (hosted IdP page, etc.). */
  getSignInUrl(): Promise<string>;
  /** Clear the session. No-op for non-interactive providers. */
  signOut(): Promise<void>;
}
