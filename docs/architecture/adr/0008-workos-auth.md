# 0008 — WorkOS for authentication and SSO

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Capt. Dan Moi Ng'ong'a (delegated); Claude Code agent

## Context

The platform serves operators (AOC holders) whose Accountable Manager and Head of Training typically have corporate identity (Google Workspace, Microsoft 365). TRI/TRE instructors and line pilots often do not — they need a magic-link or simple-credentials path.

CLAUDE.md left auth open between WorkOS and Clerk.

## Decision

**WorkOS** for production auth.

## Why

- **SSO is the right default for operators.** Operator IT teams are increasingly adopting Google Workspace or Microsoft 365 as their identity provider. WorkOS supports SAML and OIDC out of the box; Clerk does too but its centre-of-gravity is B2C/email-first.
- **Magic Link covers the long tail.** WorkOS Magic Link handles instructors and pilots who don't have corporate IdP without forcing them through a SAML setup.
- **Multi-tenancy mapping is explicit.** WorkOS Organizations map cleanly to our `Operator` entity — one WorkOS Organization per AOC holder. Clerk's organisations work but the semantic fit is looser.
- **Audit-grade event stream.** WorkOS emits `session.created`, `user.authenticated`, etc. as webhooks we can route into our `audit_events` table — closes the Audit-Login circle from ADR 0003.
- **Pricing fit.** WorkOS is free up to 1M MAUs for SSO; operators have ≤100 users each, so the platform stays in the free tier for years.

## Consequences

- The Fastify `auth` plugin (ADR 0007) verifies a WorkOS-issued JWT on each request, extracts the WorkOS Organization id, and resolves it to our `Operator.id` via a lookup table.
- The first request from a new WorkOS Organization triggers an admin workflow (DNCA verifies and provisions the Operator); auto-provisioning is intentionally NOT enabled — KCAA wants accountable onboarding.
- Login UX is hosted by WorkOS (AuthKit) initially; we can self-host a login page later if branding demands.
- Per-user RBAC (the 11 roles in `@dnca/domain.ROLE`) lives in our DB, not in WorkOS. WorkOS provides identity; we provide authorisation.

## Migration story

If we ever leave WorkOS, the abstraction layer is the auth plugin. Routes never see a WorkOS-specific type — they receive a `{ user, operator, roles }` shape that any other provider can satisfy.
