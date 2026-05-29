# ADR 0011 — Provider-agnostic auth seam

**Status:** Accepted (29 May 2026). Refines ADR 0008 (WorkOS), which is now one implementation behind a seam rather than a hard dependency.

## Context

WorkOS was the chosen IdP (ADR 0008) but has been shelved on cost. The platform must be able to swap to a cheaper or in-region IdP — AWS Cognito (af-south-1, residency), self-hosted ZITADEL/Keycloak, or Supabase Auth — without touching pages, the API client, or the sign-in flow. The Kenya DPA 2019 also makes data residency a first-class concern, which favours self-hostable / in-region providers.

## Decision

Introduce a provider-agnostic auth seam on both tiers:

**Web (`apps/web/lib/auth/`)** — an `AuthProvider` interface (`getSession`, `getSignInUrl`, `signOut`, `kind`, `isInteractive`). `selectAuthProviderKind(env)` (pure) chooses the provider; `getAuthProvider()` returns it. WorkOS is one implementation (`workos-provider.ts`, the only file importing the WorkOS SDK besides the edge middleware); `demo-provider.ts` is the zero-config open-access default. Every consumer (header widget, sign-in page, API client, `/login`) depends only on the seam.

**API (`apps/api`)** — JWT verification is parameterised by `resolveJwtVerification(config)`: generic `AUTH_JWKS_URL` / `AUTH_ISSUER` / `AUTH_AUDIENCE` / `AUTH_ORG_CLAIM` take precedence over the WorkOS-derived defaults. The operator lookup matches a neutral `idpOrganizationId` (falling back to `workosOrganizationId`). Any OIDC IdP that issues a JWT with an org/tenant claim works with env alone.

## Adding a provider

1. **API:** set `AUTH_JWKS_URL`, `AUTH_ISSUER`, optionally `AUTH_AUDIENCE`, and `AUTH_ORG_CLAIM` (the claim that carries the org id). Store the IdP org id on each operator's `config.idpOrganizationId`. No code change.
2. **Web:** add an `AuthProvider` implementation (e.g. `cognito-provider.ts`) and select it in `select.ts` / `index.ts`. The edge middleware may need a provider-specific adapter (it runs before server code); token-in-header providers may need none.

## Consequences

- WorkOS is no longer load-bearing; the cost decision is deferrable.
- The demo (open-access, header-scoped) path stays the zero-config default for CI, design, and the Vercel preview.
- One pure selector/resolver per tier keeps the choice testable (`config-jwt.test.ts`).
- Recommended candidates, given cost + residency: **AWS Cognito** (in-region af-south-1) or **self-hosted ZITADEL**; **Supabase Auth** plays to the existing Postgres + RLS stack.
