import { z } from 'zod';

/**
 * Zod schema enforced on every Anthropic response to an assessment-generation
 * prompt. Parse failure or schema failure triggers retry with a corrective
 * follow-up prompt; after 2 retries an error is surfaced to the operator and
 * an AuditEvent is emitted (action: ASSESSMENT_GENERATED, with the failure
 * marker in the payload).
 */
export const McqQuestionSchema = z.object({
  question: z.string().trim().min(8, 'question is too short to be plausible'),
  options: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]),
  correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string().trim().min(16, 'explanation is too short to be useful'),
  primarySourceCitation: z.string().trim().min(4, 'citation is missing'),
});

export const AssessmentSchema = z.array(McqQuestionSchema).length(5, {
  message: 'assessment must contain exactly 5 questions',
});

export type McqQuestion = z.infer<typeof McqQuestionSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
