import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { selectAuthProviderKind } from '@/lib/auth/select';

/**
 * Auth middleware.
 *
 * When the WorkOS env vars are configured, every request runs through
 * authkitMiddleware which validates the encrypted session cookie and
 * refreshes the access token before it expires. Pages downstream can call
 * withAuth() to read the authenticated user and the access token to
 * forward to the API.
 *
 * When WORKOS_CLIENT_ID + WORKOS_API_KEY + WORKOS_COOKIE_PASSWORD are
 * unset (local dev without a WorkOS project) the middleware is a no-op
 * and pages fall through to the demo / fixture path. This preserves the
 * "anyone can clone and run" property for design work and CI.
 *
 * Public paths (the demo prototype, KCAA-facing export views, the assets
 * Next.js itself owns) are exempt from auth-required redirects so they
 * keep rendering for unauthenticated viewers (Sprint 3 will tighten
 * `unauthenticatedPaths` once the operator-facing pages are isolated).
 */

const PUBLIC_PATHS = [
  '/',
  '/aircraft',
  '/compliance',
  '/exports/crew-currency-snapshot',
  '/exports/om-cross-reference-matrix',
  '/exports/pilot-training-file',
  '/exports/kcaa-transmittal',
  '/exports/compliance-evidence-pack',
  '/sign-in',
  '/legal/terms',
  '/legal/privacy',
  '/login',
];

// Edge middleware is necessarily provider-specific (it runs before any server
// code). It activates only for the WorkOS provider; other providers either
// need no middleware (token-in-header) or get their own adapter here.
const workosMiddleware =
  selectAuthProviderKind() === 'workos'
    ? authkitMiddleware({
        middlewareAuth: {
          enabled: true,
          unauthenticatedPaths: PUBLIC_PATHS,
        },
      })
    : null;

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (workosMiddleware) return workosMiddleware(req, event);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
