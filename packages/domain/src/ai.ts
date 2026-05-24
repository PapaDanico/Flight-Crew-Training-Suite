/**
 * Pinned Anthropic model identifiers per CLAUDE.md §"Model selection". Pinning is
 * part of the audit trail — every AssessmentResult records the model id used.
 * Model strings are NOT chosen by the application at request time; they are
 * configuration constants here, advanced by ADR.
 *
 * Versions advanced when:
 *  - Anthropic releases a successor and an ADR captures the upgrade rationale.
 *  - Model deprecation forces a move and an ADR captures the migration.
 */
export const ANTHROPIC_MODELS = {
  assessmentGeneration: 'claude-sonnet-4-6',
  documentDrafting: 'claude-opus-4-7',
  summarisation: 'claude-haiku-4-5',
} as const;

export type AnthropicTask = keyof typeof ANTHROPIC_MODELS;
export type AnthropicModelId = (typeof ANTHROPIC_MODELS)[AnthropicTask];

/**
 * Versioned prompt identifier — every AssessmentResult records the promptVersion
 * used so that a generation can be reproduced from the audit log.
 */
export type PromptVersion = `${string}@${number}`;

export interface McqQuestion {
  question: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  primarySourceCitation: string;
}

export type Assessment = ReadonlyArray<McqQuestion>;
