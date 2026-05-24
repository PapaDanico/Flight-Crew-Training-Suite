import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  ASSESSMENT_TARGET,
  buildAssessmentPrompt,
  buildRetryFollowUp,
  parseAssessment,
  type Assessment,
  type AssessmentTarget,
} from '@dnca/prompts';
import { AIRCRAFT_TYPE_PROFILES, F70_100_PROFILE, tryGetAircraftTypeProfile } from '@dnca/domain';

/**
 * Server-side AI assessment proxy.
 *
 * Closes Phase-0 audit findings:
 *   §5.2 — moves the Anthropic API call off the browser; API key stays
 *          server-side
 *   §6.1 — Zod schema validation on the response (in @dnca/prompts)
 *   §6.2 — versioned, registered prompt (PROMPT_VERSIONS.assessmentGeneration)
 *   §6.6 — prompt caching via cache_control: ephemeral on the static block
 *
 * Per-IP sliding-window rate limit is in-memory only — adequate for a
 * single-region demo deployment; production should swap in Redis / Upstash.
 * No PII enters the prompt: sanitiseTopic() (in @dnca/prompts) rejects
 * licence-number-shaped input before it reaches Anthropic.
 *
 * AuditEvent emission for ASSESSMENT_GENERATED happens once the API layer
 * lands (depends on the Fastify/NestJS decision). For now the route logs
 * generations to stdout in JSON for grep-ability.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateInput {
  topic: unknown;
  target: unknown;
  aircraftTypeId?: unknown;
}

type GenerateResponse =
  | {
      ok: true;
      data: Assessment;
      modelId: string;
      promptVersion: string;
      attempts: number;
      aircraftTypeProfileId: string;
      aircraftTypeProductionReady: boolean;
      cacheUsage?: { cacheCreationInputTokens: number; cacheReadInputTokens: number };
    }
  | {
      ok: false;
      error: {
        kind:
          | 'config'
          | 'invalid-input'
          | 'rate-limit'
          | 'anthropic-error'
          | 'parse-failed-after-retries'
          | 'unknown';
        message: string;
        retryAfterSeconds?: number;
      };
    };

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map<string, number[]>();

function rateLimitCheck(
  ip: string,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const stamps = (rateBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= RATE_LIMIT_MAX) {
    const oldest = stamps[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000),
    };
  }
  stamps.push(now);
  rateBuckets.set(ip, stamps);
  return { allowed: true };
}

function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isAssessmentTarget(v: unknown): v is AssessmentTarget {
  return typeof v === 'string' && (ASSESSMENT_TARGET as readonly string[]).includes(v);
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateResponse>> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return NextResponse.json<GenerateResponse>(
      {
        ok: false,
        error: {
          kind: 'config',
          message:
            'ANTHROPIC_API_KEY is not set on the server. Set it in apps/web/.env.local to enable AI assessment generation.',
        },
      },
      { status: 503 },
    );
  }

  const ip = getRequestIp(req);
  const rate = rateLimitCheck(ip);
  if (!rate.allowed) {
    return NextResponse.json<GenerateResponse>(
      {
        ok: false,
        error: {
          kind: 'rate-limit',
          message: `Rate limit exceeded. Try again in ${rate.retryAfterSeconds} seconds.`,
          retryAfterSeconds: rate.retryAfterSeconds,
        },
      },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  let body: GenerateInput;
  try {
    body = (await req.json()) as GenerateInput;
  } catch {
    return NextResponse.json<GenerateResponse>(
      { ok: false, error: { kind: 'invalid-input', message: 'Request body is not valid JSON.' } },
      { status: 400 },
    );
  }

  if (typeof body.topic !== 'string' || !isAssessmentTarget(body.target)) {
    return NextResponse.json<GenerateResponse>(
      {
        ok: false,
        error: {
          kind: 'invalid-input',
          message: `Body must be { topic: string; target: ${ASSESSMENT_TARGET.join(' | ')}; aircraftTypeId?: ${AIRCRAFT_TYPE_PROFILES.map((p) => p.id).join(' | ')} }.`,
        },
      },
      { status: 400 },
    );
  }

  let aircraftType = F70_100_PROFILE;
  if (typeof body.aircraftTypeId === 'string') {
    const resolved = tryGetAircraftTypeProfile(body.aircraftTypeId);
    if (!resolved) {
      return NextResponse.json<GenerateResponse>(
        {
          ok: false,
          error: {
            kind: 'invalid-input',
            message: `Unknown aircraftTypeId. Known: ${AIRCRAFT_TYPE_PROFILES.map((p) => p.id).join(', ')}.`,
          },
        },
        { status: 400 },
      );
    }
    aircraftType = resolved;
  }

  let prompt;
  try {
    prompt = buildAssessmentPrompt({
      topic: body.topic,
      target: body.target,
      aircraftType,
    });
  } catch (err) {
    return NextResponse.json<GenerateResponse>(
      {
        ok: false,
        error: {
          kind: 'invalid-input',
          message: err instanceof Error ? err.message : 'Topic sanitisation failed',
        },
      },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey });

  type Msg = { role: 'user' | 'assistant'; content: string };
  const messages: Msg[] = [{ role: 'user', content: prompt.user }];

  const maxAttempts = 3;
  let lastFailureSnapshot: ReturnType<typeof parseAssessment> | null = null;
  let cacheUsage: { cacheCreationInputTokens: number; cacheReadInputTokens: number } | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Awaited<ReturnType<typeof client.messages.create>>;
    try {
      response = await client.messages.create({
        model: prompt.model,
        max_tokens: prompt.maxTokens,
        system: prompt.system as Anthropic.Messages.TextBlockParam[],
        messages,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Anthropic API call failed';
      console.error(JSON.stringify({ event: 'anthropic_error', message, attempt }));
      return NextResponse.json<GenerateResponse>(
        { ok: false, error: { kind: 'anthropic-error', message } },
        { status: 502 },
      );
    }

    const usage = response.usage as Anthropic.Messages.Usage & {
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    cacheUsage = {
      cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    };

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const parsed = parseAssessment(text);
    if (parsed.ok) {
      console.log(
        JSON.stringify({
          event: 'assessment_generated',
          model: prompt.model,
          promptVersion: prompt.promptVersion,
          target: body.target,
          aircraftTypeProfileId: prompt.aircraftTypeProfileId,
          aircraftTypeProductionReady: prompt.aircraftTypeProductionReady,
          attempts: attempt,
          cacheUsage,
        }),
      );
      return NextResponse.json<GenerateResponse>({
        ok: true,
        data: parsed.data,
        modelId: prompt.model,
        promptVersion: prompt.promptVersion,
        attempts: attempt,
        aircraftTypeProfileId: prompt.aircraftTypeProfileId,
        aircraftTypeProductionReady: prompt.aircraftTypeProductionReady,
        ...(cacheUsage ? { cacheUsage } : {}),
      });
    }

    lastFailureSnapshot = parsed;
    if (attempt < maxAttempts) {
      messages.push({ role: 'assistant', content: text });
      messages.push({ role: 'user', content: buildRetryFollowUp(parsed) });
    }
  }

  console.error(
    JSON.stringify({
      event: 'assessment_failed',
      attempts: maxAttempts,
      lastFailure: lastFailureSnapshot?.ok === false ? lastFailureSnapshot.error : null,
    }),
  );

  return NextResponse.json<GenerateResponse>(
    {
      ok: false,
      error: {
        kind: 'parse-failed-after-retries',
        message:
          lastFailureSnapshot?.ok === false
            ? `Anthropic response failed schema validation after ${maxAttempts} attempts: ${lastFailureSnapshot.error.message}`
            : `Failed after ${maxAttempts} attempts`,
      },
    },
    { status: 502 },
  );
}
