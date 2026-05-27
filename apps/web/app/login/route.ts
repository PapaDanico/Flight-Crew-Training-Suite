import { NextResponse } from 'next/server';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';

/**
 * /login — kicks off the WorkOS AuthKit sign-in flow.
 *
 * Server Components can't write cookies, but getSignInUrl() needs to set a
 * PKCE cookie for the code-exchange handshake. So the SiteHeader's
 * "Sign in" anchor points here; we resolve the auth URL inside a Route
 * Handler (where cookies are mutable) and 302 the browser onward.
 */
export async function GET() {
  const url = await getSignInUrl();
  return NextResponse.redirect(url);
}
