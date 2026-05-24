# `@dnca/prompts`

Versioned, citation-anchored Claude API prompt templates.

## Discipline

Every prompt the platform sends to the Anthropic API:

1. **Has a registered version** in `PROMPT_VERSIONS`. Bump the integer suffix whenever wording, calibration content, or output requirements change. Never reuse a version number — the audit trail must remain unambiguous.
2. **Is built from data**, not hand-edited strings. The F70/100 calibration block in `system-prompt.ts` interpolates `AIRCRAFT_FACTS` from `@dnca/domain` and `Citation` references from `@dnca/ontology`. A change to either source forces a rebuild and triggers a prompt-version bump.
3. **Validates its response.** Anthropic output is parsed by `parseAssessment()` against a Zod schema. Parse or schema failure surfaces a structured error that can drive up to two corrective retries (`buildRetryFollowUp()`) before the operator sees a failure.
4. **Records modelId + promptVersion** in every `AssessmentResult` row (see `@dnca/domain`). The audit log can reproduce any generation by replaying the same model + prompt version against the same input.
5. **Sanitises input.** `sanitiseTopic()` rejects empty / over-long / prompt-injection-shaped / licence-number-shaped inputs before they reach the prompt builder. PII never enters a prompt.

## Prompt caching

`buildAssessmentPrompt()` returns the static F70/100 calibration block marked `cache_control: { type: 'ephemeral' }`. Anthropic's prompt cache reuses this block for up to 5 minutes across requests, so repeated assessment generations pay only for the dynamic per-request block. The static block is engineered to exceed Anthropic's 1024-token minimum for cache effectiveness.

## Usage

```ts
import { buildAssessmentPrompt, parseAssessment, buildRetryFollowUp } from '@dnca/prompts';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const prompt = buildAssessmentPrompt({
  topic: 'Engine fire on take-off',
  target: 'type-recurrent',
});

let lastError: ReturnType<typeof parseAssessment> | null = null;

for (let attempt = 0; attempt < 3; attempt++) {
  const messages =
    lastError && !lastError.ok
      ? [{ role: 'user' as const, content: buildRetryFollowUp(lastError) }]
      : [{ role: 'user' as const, content: prompt.user }];

  const response = await client.messages.create({
    model: prompt.model,
    system: prompt.system,
    max_tokens: prompt.maxTokens,
    messages,
  });

  const text = response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const parsed = parseAssessment(text);
  if (parsed.ok) {
    // Persist AssessmentResult with prompt.model + prompt.promptVersion
    // Emit AuditEvent: action = 'ASSESSMENT_GENERATED'
    return parsed.data;
  }
  lastError = parsed;
}

// After 2 retries — surface a structured error to the operator and emit
// an AuditEvent recording the final failure.
throw new Error('assessment generation failed after 2 retries');
```

## Versioning

```ts
import { PROMPT_VERSIONS } from '@dnca/prompts';

PROMPT_VERSIONS.assessmentGeneration; // 'assessment-generation@1'
```

When updating:

1. Edit the prompt content.
2. Bump the integer suffix in `version.ts` (`...@1` → `...@2`).
3. Note the change in an ADR if the change is substantive (calibration content, output format).
4. Existing `AssessmentResult` rows continue to reference the old version, preserving reproducibility.
