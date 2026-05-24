import { ANTHROPIC_MODELS, type AnthropicModelId } from '@dnca/domain';
import { F70_100_CALIBRATION_SYSTEM_BLOCK } from './system-prompt.js';
import { PROMPT_VERSIONS } from './version.js';

/**
 * Calibration target for the assessment. Controls the difficulty profile and
 * the kinds of cognitive objectives the prompt prioritises. Open question
 * #5 in CLAUDE.md is the desired UX for selecting this; the data model
 * is in place.
 */
export const ASSESSMENT_TARGET = [
  'itr-ground',
  'type-recurrent',
  'crm',
  'lpc-opc-review',
] as const;
export type AssessmentTarget = (typeof ASSESSMENT_TARGET)[number];

const TARGET_GUIDANCE: Readonly<Record<AssessmentTarget, string>> = {
  'itr-ground':
    'Initial Type Rating ground school. Mix recall and comprehension. ' +
    'Cover aircraft systems, performance, mass & balance, ops procedures, ' +
    'regulations, and Human Factors. Target a learner who has had 0-80 ' +
    'classroom hours.',
  'type-recurrent':
    'Annual recurrent ground / OPC preparation. Mix application and ' +
    'analysis. Lean toward scenario-based questions: abnormal handling, ' +
    'decision-making under uncertainty, EICAS interpretation. The ' +
    'candidate is a current line pilot.',
  crm:
    'CRM / TEM recurrent. Behavioural and non-technical. T-DODAR, threat ' +
    'and error management, communication, leadership, automation ' +
    'management, fatigue. Questions test judgement, not memorisation. ' +
    'Distractors reflect realistic crew-room debate.',
  'lpc-opc-review':
    'Examiner-level Skills Test / LPC / OPC preparation. Maximum precision. ' +
    'Reference QRH actions, AFM limits, regulatory thresholds with exact ' +
    'figures. A pilot who passes this should be ready for a Skills Test.',
};

/**
 * Anthropic Messages API content-block shape, with cache_control marker for
 * prompt caching. Callers may pass this directly to the SDK.
 *
 * Cache-control: blocks marked 'ephemeral' are cached for up to 5 minutes
 * (Anthropic's standard cache TTL). The static F70 calibration block is
 * marked; the dynamic per-request block is not.
 */
export interface PromptTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface AssessmentPromptComponents {
  /** Pinned Anthropic model id - recorded in AssessmentResult.modelId. */
  model: AnthropicModelId;
  /** Versioned prompt identifier - recorded in AssessmentResult.promptVersion. */
  promptVersion: string;
  /** System blocks: static (cache-eligible) + per-request (uncached). */
  system: ReadonlyArray<PromptTextBlock>;
  /** User message - the topic-specific instruction. */
  user: string;
  /** Maximum tokens for the response. Tuned to fit a 5-question assessment. */
  maxTokens: 2_000;
}

export interface BuildAssessmentPromptInput {
  topic: string;
  target: AssessmentTarget;
}

export function buildAssessmentPrompt(
  input: BuildAssessmentPromptInput,
): AssessmentPromptComponents {
  const cleanedTopic = sanitiseTopic(input.topic);
  const targetGuidance = TARGET_GUIDANCE[input.target];

  const dynamicSystemBlock =
    `# This generation\n\n` +
    `Calibration target: **${input.target}**.\n${targetGuidance}\n\n` +
    `Generate exactly 5 multiple-choice questions on the topic: ` +
    `"${cleanedTopic}".`;

  return {
    model: ANTHROPIC_MODELS.assessmentGeneration,
    promptVersion: PROMPT_VERSIONS.assessmentGeneration,
    system: [
      {
        type: 'text',
        text: F70_100_CALIBRATION_SYSTEM_BLOCK,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: dynamicSystemBlock,
      },
    ],
    user: `Topic: ${cleanedTopic}`,
    maxTokens: 2_000,
  };
}

/**
 * Defensive sanitisation: strip control characters and excessive whitespace,
 * and refuse anything that looks like a prompt-injection attempt or contains
 * personally-identifiable data per CLAUDE.md "Never include real pilot PII
 * in prompts."
 */
export function sanitiseTopic(raw: string): string {
  const stripped = stripControlChars(raw).replace(/\s+/g, ' ').trim();
  if (stripped.length === 0) {
    throw new Error('assessment topic is empty');
  }
  if (stripped.length > 200) {
    throw new Error('assessment topic exceeds 200 characters');
  }
  if (/(ignore previous|system prompt|you are now)/i.test(stripped)) {
    throw new Error('assessment topic looks like a prompt-injection attempt');
  }
  if (/KCAA\/(ATPL|CPL)\/\d+/i.test(stripped)) {
    throw new Error('assessment topic contains a pilot licence number; reject');
  }
  return stripped;
}

function stripControlChars(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code < 0x20 || code === 0x7f) {
      out += ' ';
    } else {
      out += ch;
    }
  }
  return out;
}
