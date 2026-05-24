# `@dnca/web`

Next.js 15 (App Router) frontend for the Fokker 70/100 Flight Crew Training Suite.

## Status

Sprint 2 starter. Three live pages, all composing data from the typed workspace packages:

- **`/`** — Overview, regulatory cliff visibility (`@dnca/ontology` LN 42/2026 + Reg 84 deadline).
- **`/aircraft`** — F70/100 facts table (`@dnca/domain` `AIRCRAFT_FACTS` + `exceedsFdapThreshold()`).
- **`/compliance`** — KCARs/ICAO/FAA/EASA cross-reference matrix, Third Schedule structure, Sixth Schedule penalties (`@dnca/ontology` `DOMAIN_CROSS_REFERENCE`, `THIRD_SCHEDULE`, `SIXTH_SCHEDULE_PENALTIES`).

No mocked data. No backend yet — pages are statically rendered from typed source-of-truth data, so anything that would drift between the prompt block, the UI, and the database is impossible by construction (ADR 0004).

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
