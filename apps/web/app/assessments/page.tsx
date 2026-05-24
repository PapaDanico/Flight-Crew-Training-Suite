'use client';

import { useState } from 'react';
import { ASSESSMENT_TARGET, type Assessment, type AssessmentTarget } from '@dnca/prompts';
import {
  AIRCRAFT_TYPE_PROFILES,
  F70_100_PROFILE_ID,
  type AircraftTypeProfileId,
} from '@dnca/domain';
import { AlertTriangle, BookOpen, Brain, CheckCircle, Sparkles, XCircle } from 'lucide-react';

const TARGET_LABELS: Record<AssessmentTarget, string> = {
  'itr-ground': 'ITR Ground School',
  'type-recurrent': 'Type Recurrent / OPC prep',
  crm: 'CRM / TEM',
  'lpc-opc-review': 'LPC / OPC / Skills Test prep',
};

const SUGGESTED_TOPICS: ReadonlyArray<string> = [
  'Engine failure on takeoff',
  'Stabilised approach gate',
  'Hydraulic system architecture',
  'CRM & T-DODAR',
  'Takeoff flap selection',
  'VMA approach speed system',
  'Rapid decompression',
  'OEI go-around',
];

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
      error: { kind: string; message: string; retryAfterSeconds?: number };
    };

export default function AssessmentsPage() {
  const [topic, setTopic] = useState('');
  const [target, setTarget] = useState<AssessmentTarget>('type-recurrent');
  const [aircraftTypeId, setAircraftTypeId] = useState<AircraftTypeProfileId>(F70_100_PROFILE_ID);
  const selectedProfile = AIRCRAFT_TYPE_PROFILES.find((p) => p.id === aircraftTypeId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<
    | (Extract<GenerateResponse, { ok: true }> & {
        answers: Record<number, 0 | 1 | 2 | 3>;
        submitted: boolean;
      })
    | null
  >(null);

  async function handleGenerate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);
    setGenerated(null);
    try {
      const res = await fetch('/api/assessments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), target, aircraftTypeId }),
      });
      const body = (await res.json()) as GenerateResponse;
      if (body.ok) {
        setGenerated({ ...body, answers: {}, submitted: false });
      } else {
        setError(body.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function pick(qIdx: number, optIdx: 0 | 1 | 2 | 3) {
    setGenerated((prev) =>
      prev ? { ...prev, answers: { ...prev.answers, [qIdx]: optIdx } } : prev,
    );
  }

  function submit() {
    setGenerated((prev) => (prev ? { ...prev, submitted: true } : prev));
  }

  const score = generated
    ? Object.entries(generated.answers).filter(
        ([i, v]) => v === generated.data[Number(i)]?.correctIndex,
      ).length
    : 0;
  const total = generated?.data.length ?? 0;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percent >= 80;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-900">
          <Brain className="h-6 w-6 text-navy-700" />
          AI assessment generator
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          5-question MCQ generation calibrated to F70/100 type-rated pilots. Server-side proxy via a
          Next.js Route Handler — Anthropic API key never reaches the browser. Schema-validated with
          up to 2 retries; per-IP rate limited; prompt-cached. Pass mark: 80%.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              placeholder="e.g. Rejected takeoff, RR Tay engine, T-DODAR..."
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {SUGGESTED_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  disabled={loading}
                  className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-200"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Aircraft type
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AIRCRAFT_TYPE_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAircraftTypeId(p.id)}
                  disabled={loading}
                  className={`rounded border px-3 py-2 text-left text-xs transition ${
                    aircraftTypeId === p.id
                      ? 'border-navy-700 bg-navy-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-navy-300'
                  }`}
                >
                  <div className="font-medium">{p.shortLabel}</div>
                  <div
                    className={`text-[10px] ${aircraftTypeId === p.id ? 'text-amber-300' : 'text-slate-500'}`}
                  >
                    {p.status === 'production-ready' ? 'Production-ready' : 'Preview'}
                  </div>
                </button>
              ))}
            </div>
            {selectedProfile && selectedProfile.status !== 'production-ready' ? (
              <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                <strong>Preview profile.</strong> Operational technique and detailed AI calibration
                for {selectedProfile.longLabel} have not yet been populated by a TRI/TRE qualified
                on type. The prompt will avoid type-specific technical claims and frame questions
                generically. Promote to production-ready in Phase 1 of an operator deployment.
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Calibration target
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ASSESSMENT_TARGET.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTarget(t)}
                  disabled={loading}
                  className={`rounded border px-3 py-2 text-xs transition ${
                    target === t
                      ? 'border-navy-700 bg-navy-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-navy-300'
                  }`}
                >
                  {TARGET_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!topic.trim() || loading}
              className="inline-flex items-center gap-2 rounded bg-amber-500 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generating…' : 'Generate'}
            </button>
            {generated ? (
              <span className="text-xs text-slate-500">
                Type:{' '}
                <code className="rounded bg-slate-100 px-1">{generated.aircraftTypeProfileId}</code>
                {!generated.aircraftTypeProductionReady ? ' (preview)' : ''}
                {' · '}
                Model: <code className="rounded bg-slate-100 px-1">{generated.modelId}</code>
                {' · '}
                Prompt: <code className="rounded bg-slate-100 px-1">{generated.promptVersion}</code>
                {generated.attempts > 1 ? ` · ${generated.attempts} attempts` : ''}
                {generated.cacheUsage && generated.cacheUsage.cacheReadInputTokens > 0
                  ? ` · cache hit (${generated.cacheUsage.cacheReadInputTokens} tokens read)`
                  : null}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <section className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>{error}</div>
        </section>
      ) : null}

      {generated ? (
        <section className="space-y-4">
          {generated.data.map((q, qIdx) => (
            <article key={qIdx} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-navy-900">
                {qIdx + 1}. {q.question}
              </p>
              <ul className="mt-3 space-y-1">
                {q.options.map((opt, oIdx) => {
                  const selected = generated.answers[qIdx] === oIdx;
                  const isCorrect = generated.submitted && oIdx === q.correctIndex;
                  const isWrong = generated.submitted && selected && oIdx !== q.correctIndex;
                  const base =
                    'w-full text-left px-3 py-2 text-sm rounded border transition disabled:cursor-default';
                  const colour = isCorrect
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                    : isWrong
                      ? 'bg-red-50 border-red-500 text-red-900'
                      : selected
                        ? 'bg-blue-50 border-blue-500 text-navy-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';
                  return (
                    <li key={oIdx}>
                      <button
                        type="button"
                        onClick={() => pick(qIdx, oIdx as 0 | 1 | 2 | 3)}
                        disabled={generated.submitted}
                        className={`${base} ${colour}`}
                      >
                        <span className="mr-2 font-semibold">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        {opt}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {generated.submitted ? (
                <div className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-700">
                  <div>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                  <div className="mt-1 flex items-start gap-1 text-slate-500">
                    <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{q.primarySourceCitation}</span>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {!generated.submitted ? (
            <button
              type="button"
              onClick={submit}
              disabled={Object.keys(generated.answers).length < generated.data.length}
              className="rounded bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Submit assessment
            </button>
          ) : (
            <div
              className={`flex items-center gap-3 rounded-lg border p-4 text-sm ${
                passed
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-red-300 bg-red-50 text-red-900'
              }`}
            >
              {passed ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <div>
                <strong>
                  Score: {score} / {total} — {percent}%
                </strong>
                {' · '}
                {passed ? 'Pass' : 'Below 80% pass mark — remedial training advised'}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
