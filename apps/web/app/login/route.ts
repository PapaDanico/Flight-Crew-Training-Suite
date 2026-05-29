import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';

/**
 * /login — begins the active provider's sign-in flow.
 *
 * Server Components can't write cookies, but a provider may need to set one
 * (e.g. WorkOS PKCE) when resolving the sign-in URL. So the SiteHeader's
 * "Sign in" anchor points here; we resolve the URL inside a Route Handler
 * (where cookies are mutable) and 302 the browser onward.
 */
export async function GET() {
  const url = await getAuthProvider().getSignInUrl();
  return NextResponse.redirect(url);
}
