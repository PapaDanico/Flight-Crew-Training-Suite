import { handleAuth } from '@workos-inc/authkit-nextjs';

/**
 * WorkOS AuthKit OAuth callback. After the user signs in on the AuthKit-
 * hosted page, WorkOS redirects here with an authorization code. handleAuth
 * exchanges it for access + refresh tokens, encrypts them into the session
 * cookie, and redirects the user back to the path they came from (or '/').
 *
 * The redirect URI configured in the WorkOS dashboard must point to this
 * route — see apps/web/.env.example.
 */
export const GET = handleAuth();
