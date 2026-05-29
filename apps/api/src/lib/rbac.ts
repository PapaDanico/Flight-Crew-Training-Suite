import type { Role } from '@dnca/domain';
import type { Principal } from '../plugins/auth.js';

/**
 * Per-route authorisation. The auth plugin attached a Principal to every
 * request; routes call `requireRole(principal, allowed)` to enforce the
 * minimum role required to perform the action.
 *
 * Discipline (CLAUDE.md + Sprint 2 audit):
 *  - PLATFORM_ADMIN is DNCA-internal; bypasses every check (deployment +
 *    incident response).
 *  - Mutating routes ALWAYS gate. A signed-in PILOT cannot DELETE a pilot
 *    record or sign off a session.
 *  - Read routes are operator-scoped at the DB layer via RLS; RBAC adds
 *    role gates only where required by the OM (e.g. audit-log access in
 *    Sprint 3).
 *
 * Mapping of regulatory roles to platform actions:
 *  - PILOT_WRITE          = HOT, CHIEF_PILOT (pilot record CRUD, head-count)
 *  - PILOT_DELETE         = HOT, ACCOUNTABLE_MANAGER (soft-delete with reason)
 *  - CURRENCY_ISSUE       = TRI, TRE, LCE, HOT (issue/renew currency records)
 *  - SESSION_CREATE       = TRI, TRE, LCE, LTC (instructor-led training)
 *  - SESSION_SIGN_OFF     = TRE, LCE, LTC, HOT, ACCOUNTABLE_MANAGER
 *                           (signing authority per KCARs)
 */

export const ROLE_GROUPS = {
  // Sign-off authorities. KCARs requires the sign-off to come from a
  // qualified examiner / line-check examiner / training captain / HoT / AM.
  // TRI cannot sign off proficiency checks alone — that's TRE's authority.
  SESSION_SIGN_OFF: ['TRE', 'LCE', 'LTC', 'HEAD_OF_TRAINING', 'ACCOUNTABLE_MANAGER'] as const,

  // Instructor authorities. TRI/TRE/LCE/LTC can log sessions and exercises.
  SESSION_CREATE: ['TRI', 'TRE', 'LCE', 'LTC', 'HEAD_OF_TRAINING'] as const,

  // Currency issuance: same instructor pool plus HoT for administrative
  // issuance (e.g. non-flight currencies like ELP).
  CURRENCY_ISSUE: ['TRI', 'TRE', 'LCE', 'LTC', 'HEAD_OF_TRAINING'] as const,

  // Pilot record administration. HoT, Chief Pilot, AM.
  PILOT_WRITE: ['HEAD_OF_TRAINING', 'CHIEF_PILOT', 'ACCOUNTABLE_MANAGER'] as const,

  // Soft-delete requires the highest authority + a written reason.
  PILOT_DELETE: ['HEAD_OF_TRAINING', 'ACCOUNTABLE_MANAGER'] as const,
} satisfies Record<string, ReadonlyArray<Role>>;

export type RoleGroup = keyof typeof ROLE_GROUPS;

/**
 * Throws a 403-shaped error if the principal does not hold any of the
 * allowed roles. PLATFORM_ADMIN always passes (DNCA-internal bypass).
 */
export function requireRole(principal: Principal, allowed: ReadonlyArray<Role>): void {
  if (principal.roles.includes('PLATFORM_ADMIN')) return;
  const ok = principal.roles.some((r) => allowed.includes(r));
  if (!ok) {
    const err = new Error(
      `Principal lacks required role. Have: [${principal.roles.join(', ')}]. ` +
        `Need one of: [${allowed.join(', ')}].`,
    );
    (err as Error & { statusCode: number; name: string }).statusCode = 403;
    (err as Error & { statusCode: number; name: string }).name = 'forbidden';
    throw err;
  }
}

export function requireRoleGroup(principal: Principal, group: RoleGroup): void {
  requireRole(principal, ROLE_GROUPS[group]);
}
