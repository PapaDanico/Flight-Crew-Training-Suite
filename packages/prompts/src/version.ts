import type { PromptVersion } from '@dnca/domain';

/**
 * Registry of prompt versions in active use. Every AssessmentResult records
 * the version used so generations are reproducible from the audit log.
 *
 * Bump the integer suffix when a prompt's wording, calibration content, or
 * output requirements change. Never reuse a version number — the audit trail
 * must remain unambiguous.
 */
export const PROMPT_VERSIONS = {
  assessmentGeneration: 'assessment-generation@1' satisfies PromptVersion,
} as const;

export type RegisteredPromptVersion = (typeof PROMPT_VERSIONS)[keyof typeof PROMPT_VERSIONS];
