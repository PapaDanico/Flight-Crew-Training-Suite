import { AssessmentSchema, type Assessment } from './schemas.js';

export type ParseAssessmentResult =
  | { ok: true; data: Assessment }
  | {
      ok: false;
      error: {
        kind: 'invalid-json' | 'schema-failure';
        message: string;
        issues?: ReadonlyArray<{ path: string; message: string }>;
      };
    };

/**
 * Parse and validate an Anthropic response into an Assessment. The Anthropic
 * response sometimes includes incidental markdown fences despite the system
 * prompt requesting otherwise; stripping them is a tolerated defensive step
 * and not a substitute for the prompt's explicit format requirement.
 */
export function parseAssessment(rawText: string): ParseAssessmentResult {
  const stripped = stripMarkdownFences(rawText.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: 'invalid-json',
        message: err instanceof Error ? err.message : 'JSON parse failed',
      },
    };
  }

  const result = AssessmentSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: {
        kind: 'schema-failure',
        message: 'response did not match AssessmentSchema',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    };
  }

  return { ok: true, data: result.data };
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

/**
 * Builds a corrective follow-up prompt for retry after a parse / schema
 * failure. The original system block is unchanged (and cached); only the
 * follow-up user message changes.
 */
export function buildRetryFollowUp(failure: Extract<ParseAssessmentResult, { ok: false }>): string {
  if (failure.error.kind === 'invalid-json') {
    return (
      `Your previous response was not valid JSON: ${failure.error.message}. ` +
      `Re-emit the entire assessment as a single JSON array with no preamble, ` +
      `commentary, or markdown fences. Match the schema exactly.`
    );
  }
  const issues = (failure.error.issues ?? []).map((i) => `- ${i.path}: ${i.message}`).join('\n');
  return (
    `Your previous response did not match the required schema:\n${issues}\n\n` +
    `Re-emit the entire assessment as a JSON array of exactly 5 questions ` +
    `matching the schema. Do not add commentary or markdown fences.`
  );
}
