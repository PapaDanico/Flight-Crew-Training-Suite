# Deployment

Two distinct deployment targets, two distinct hosts.

| Target           | Audience                                     | Host   | Region                   | Lifetime                   |
| ---------------- | -------------------------------------------- | ------ | ------------------------ | -------------------------- |
| **Demo**         | Prospective operators, internal walkthroughs | Vercel | `fra1` (Frankfurt)       | As long as the demo serves |
| **Operator MVP** | Real operator system-of-record               | AWS    | `af-south-1` (Cape Town) | Per-operator deployment    |

The split exists because **the constraints are different**.

## Why Vercel for the demo

- Native Next.js host; zero config from this repo (`vercel.json` already in place).
- Free tier covers the entire demo footprint (4 demo pilots, deterministic fixtures, no PII).
- Serverless functions handle `/api/assessments/generate` natively — `@anthropic-ai/sdk` works out of the box.
- Server env vars (`ANTHROPIC_API_KEY`) stay server-side; never reach the browser.
- Frankfurt → Nairobi RTT is ~120 ms, comfortable for an interactive 10-minute walkthrough.
- Push to `main` (or any branch) → live URL in under 60 s.
- Vercel has **no Africa region** — that's the disqualifier for production, not for demos.

## Why AWS `af-south-1` for operator MVP

The reason isn't latency to Nairobi — Frankfurt is acceptable. The reason is **Kenya Data Protection Act 2019**.

DNCA is the data controller for every operator's training records. The DPA requires:

- Data residency for personal data within the East African region where feasible (Cape Town meets the "feasible" bar for a Kenyan data subject; Frankfurt does not under typical interpretations).
- ODPC registration as data controller, with the location of the processing infrastructure declared.
- Breach-notification readiness within 72 hours.

Cape Town (`af-south-1`) is the natural fit: AWS-mature, Postgres-15-on-RDS available, Object Lock for the audit-log archive, OpenTelemetry-friendly. Azure South Africa North is the second-best option if AWS is unavailable for any operator-specific procurement reason.

## Deploying the demo to Vercel — step-by-step

Prerequisites:

- Vercel account
- Anthropic API key with billing limit set
- Repository pushed to GitHub (already done; PR #1)

Steps:

1. Visit https://vercel.com/new and select this repository.
2. **Root directory:** `apps/web` (Vercel detects the monorepo).
3. **Framework Preset:** Next.js (auto-detected).
4. **Build command:** leave default (`vercel.json` overrides with the workspace-aware build).
5. **Environment variables:**
   - `ANTHROPIC_API_KEY` → your key (set scope to _Production_ + _Preview_ + _Development_ as needed).
6. Click **Deploy**.

Vercel returns a live URL within 60–90 seconds (build time dominated by the pnpm install for the workspace). Add a custom domain (`demo.dnca.aero` or similar) under **Settings → Domains**.

## Operating cost (rough)

For the demo on Vercel free tier with one Anthropic key:

- Vercel hosting: $0 (Hobby tier covers the demo footprint).
- Anthropic API: dominated by the cacheable F70/100 system block. With prompt caching on, repeated generations of the same calibration are ~85% cheaper than uncached. Expect $0.20–$1.00 per 100 generations at Sonnet 4.6 rates. Set a $50/month cap on the Anthropic console.
- Domain: $0 if using `*.vercel.app`, ~$15/yr for `demo.dnca.aero`.

For the operator MVP on AWS `af-south-1`:

- Postgres RDS (db.t4g.small, single-AZ for v1): ~$30/month per operator.
- App hosting (App Runner or ECS-Fargate, 0.5 vCPU): ~$25/month.
- S3 + Object Lock for documents and audit-log archive: ~$5/month under typical operator volumes.
- CloudWatch / OpenTelemetry: ~$10/month.
- **Total: ~$70/month per operator** before traffic costs.

Build cost ≪ Phase 2/3 fees in the commercial model. Infra is not the constraint.

## CI deployment (post-MVP)

The current `.github/workflows/ci.yml` runs typecheck + test + format on every PR. Production deployment from `main` lands in Sprint 5 per CLAUDE.md ("CI/CD: GitHub Actions with manual production promotion gate"). Sequence:

1. PR merged to `main`.
2. CI runs typecheck + test + format + migration smoke-test.
3. Vercel auto-deploys the demo from `main`.
4. AWS deployment is gated on a manual "promote to operator" GitHub Actions workflow with a required reviewer.

The manual promotion gate is intentional: production deployments touch a real operator's training records.

## Notes for the demo URL

- Keep the demo as `*.vercel.app` initially. Custom domain only once Capt. Ng'ong'a is comfortable sharing it externally.
- Demo data is deterministic and PII-free (`Capt. Alpha One` pattern); no DPA exposure.
- The AI assessment generator works live but is rate-limited per-IP. A single prospective-operator demo session generates 3–5 assessments — well within the 5-per-5-minute window.
- The print-export routes (`/exports/crew-currency-snapshot`, `/exports/om-cross-reference-matrix`) work without an API key — Cmd-P / Save-as-PDF in any browser.
