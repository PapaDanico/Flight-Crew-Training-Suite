# syntax=docker/dockerfile:1.6
#
# @dnca/api production image. Multi-stage build:
#   1. deps    — install full workspace dependencies from the lockfile
#   2. runtime — slim Node 22 image with just what the API needs to run
#
# Build from the repository root so the workspace context is reachable:
#   docker build -f apps/api/Dockerfile -t dnca-api:latest .
#
# Sprint 4 follow-on: pre-compile TS to JS instead of running through tsx
# at startup, drop tsx + workspace source from the runtime image.

# ----- deps stage ---------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /repo

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/
COPY packages/ontology/package.json ./packages/ontology/
COPY packages/prompts/package.json ./packages/prompts/
COPY packages/exports/package.json ./packages/exports/
COPY packages/db/package.json ./packages/db/

RUN pnpm install --frozen-lockfile --prod=false

# ----- runtime stage ------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /repo

# tsx bundles esbuild, whose native binary needs libc6-compat on alpine.
RUN apk add --no-cache tini libc6-compat
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/domain ./packages/domain
COPY packages/ontology ./packages/ontology
COPY packages/prompts ./packages/prompts
COPY packages/exports ./packages/exports
COPY packages/db ./packages/db

USER node
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]
