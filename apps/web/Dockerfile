# syntax=docker/dockerfile:1.6
#
# @dnca/web production image. Multi-stage build using Next.js standalone
# output (next.config.js `output: 'standalone'`) so the runtime image is
# minimal — no pnpm, no full node_modules, just the .next/standalone
# folder + static assets.
#
# Build from the repository root:
#   docker build -f apps/web/Dockerfile -t dnca-web:latest .

# ----- deps stage ---------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /repo

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/domain/package.json ./packages/domain/
COPY packages/ontology/package.json ./packages/ontology/
COPY packages/prompts/package.json ./packages/prompts/
COPY packages/exports/package.json ./packages/exports/

RUN pnpm install --frozen-lockfile --prod=false

# ----- builder stage ------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js SWC native binary needs libc6-compat on alpine (musl) — without
# it `next build` dies loading the SWC binary, which is invisible on a
# glibc dev machine. Must be on the BUILDER stage (where next build runs),
# not just deps.
RUN apk add --no-cache libc6-compat

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages/domain ./packages/domain
COPY packages/ontology ./packages/ontology
COPY packages/prompts ./packages/prompts
COPY packages/exports ./packages/exports

# NEXT_PUBLIC_* env vars must be present at build time because they're
# inlined into the client bundle. Production deploys should pass these
# via Docker build args; local builds can leave them unset.
ARG NEXT_PUBLIC_WORKOS_REDIRECT_URI=""
ENV NEXT_PUBLIC_WORKOS_REDIRECT_URI=${NEXT_PUBLIC_WORKOS_REDIRECT_URI}

WORKDIR /repo/apps/web
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm exec next build

# ----- runtime stage ------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache tini libc6-compat
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone output (next.config.js `output: 'standalone'` +
# `outputFileTracingRoot: <repo-root>`) produces:
#   .next/standalone/apps/web/server.js   <- the entry point
#   .next/standalone/apps/web/.next/      <- server-side bundles
#   .next/standalone/packages/*/          <- traced workspace packages
#   .next/standalone/node_modules/         <- traced external deps
# Static assets and public/ are not in standalone; copy them separately.
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
