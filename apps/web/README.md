# `@dnca/web`

Next.js 15 (App Router) frontend for the DNCA Flight Crew Training Suite.

## Status

Sprint 2. `/pilots` and `/pilots/[id]` read from `@dnca/api` over HTTP when configured, with a deterministic fixture fallback for unconfigured environments. WorkOS AuthKit is wired for sign-in/out (ADR 0008); when the WorkOS env vars are unset the app runs in demo mode. A source badge on each page and an auth widget in the header surface which mode is active — no silent degradation.

## Three running modes

| Mode         | Trigger                                            | Auth UI            | API auth header                  | Data           |
| ------------ | -------------------------------------------------- | ------------------ | -------------------------------- | -------------- |
| **WorkOS**   | All four `WORKOS_*` + `API_BASE_URL` set           | Sign in / Sign out | `Authorization: Bearer <access>` | Live           |
| **Demo**     | `API_BASE_URL` + `DEMO_OPERATOR_ID` set, no WorkOS | "Demo mode" pill   | `x-demo-operator-id: <uuid>`     | Live           |
| **Fixtures** | Neither configured                                 | "Demo mode" pill   | n/a                              | `@dnca/domain` |

Required env vars (server-only unless prefixed `NEXT_PUBLIC_`):

| Var                               | Mode          | Purpose                                                                                       |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `API_BASE_URL`                    | Demo + WorkOS | Base URL of `@dnca/api`. Falls back to fixtures when unset.                                   |
| `DEMO_OPERATOR_ID`                | Demo only     | Operator UUID sent as `x-demo-operator-id`. Mutually exclusive with WorkOS (WorkOS wins).     |
| `WORKOS_API_KEY`                  | WorkOS        | WorkOS Management API secret (`sk_...`).                                                      |
| `WORKOS_CLIENT_ID`                | WorkOS        | WorkOS project public id (`client_...`).                                                      |
| `WORKOS_COOKIE_PASSWORD`          | WorkOS        | >= 32 char secret for encrypting the session cookie. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | WorkOS        | OAuth callback. Must exactly match the redirect URI configured in the WorkOS dashboard.       |

Local dev with live API + WorkOS:

```bash
# terminal 1 — Postgres
docker compose -f infra/docker-compose.yml up -d

# terminal 2 — API
DATABASE_URL='postgres://app_runtime:dev@localhost:5432/fokker_dev' \
  WORKOS_CLIENT_ID='client_01...' \
  pnpm --filter @dnca/api dev

# terminal 3 — web
API_BASE_URL=http://localhost:3001 \
  WORKOS_API_KEY='sk_test_...' \
  WORKOS_CLIENT_ID='client_01...' \
  WORKOS_COOKIE_PASSWORD='...32+ char secret...' \
  NEXT_PUBLIC_WORKOS_REDIRECT_URI='http://localhost:3000/callback' \
  pnpm --filter @dnca/web dev
```

Local dev without WorkOS (demo mode):

```bash
API_BASE_URL=http://localhost:3001 \
  DEMO_OPERATOR_ID=22222222-2222-2222-2222-222222222222 \
  pnpm --filter @dnca/web dev
```

To provision a new operator deployment for WorkOS: store the WorkOS organization id in the `operators.config->>'workosOrganizationId'` jsonb field — the API resolves the operator scope from the JWT's `org_id` claim against this column.

## Local development

```bash
pnpm install
pnpm --filter @dnca/web dev
```

Open <http://localhost:3000>.

## Build

```bash
pnpm --filter @dnca/web build
```

`next build` performs a full type-check; CI runs it as part of the typecheck job.

## What's next

- Pilot list + currency tracker (Sprint 2 — requires backend wiring; until then, fixture data via `@dnca/db` seed)
- Session logging + per-exercise CBTA grading UI (Sprint 4)
- KCAA submission flow + document version diff (Sprint 3)
- AI assessment generator wired through `@dnca/prompts` and a server-side proxy (Sprint 4)
- Operator branding override at runtime (replace navy/amber defaults via `OperatorConfig.branding`)
