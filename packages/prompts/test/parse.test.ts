import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAssessment, buildRetryFollowUp } from '../src/parse.js';

const validResponse = JSON.stringify(
  Array.from({ length: 5 }, (_, i) => ({
    question: `Question ${i + 1} — what is the maximum fuel asymmetry en-route on the F70/100?`,
    options: ['500 kg', '750 kg', '1,000 kg', '1,500 kg'],
    correctIndex: 2,
    explanation:
      'The F70/100 maximum en-route fuel asymmetry is 1,000 kg per the AFM limitations. ' +
      'Other values are common distractors held by pilots transitioning from other types.',
    primarySourceCitation: 'F70/100 AFM §3.05.10 Limitations',
  })),
);

describe('parseAssessment', () => {
  it('accepts a well-formed 5-question array', () => {
    const result = parseAssessment(validResponse);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.length, 5);
      assert.equal(result.data[0]!.correctIndex, 2);
    }
  });

  it('strips a wrapping markdown json fence', () => {
    const fenced = '```json\n' + validResponse + '\n```';
    const result = parseAssessment(fenced);
    assert.equal(result.ok, true);
  });

  it('reports invalid-json with a usable message', () => {
    const result = parseAssessment('not really json {');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'invalid-json');
      assert.match(result.error.message, /Unexpected|JSON/);
    }
  });

  it('reports schema-failure when the array has the wrong length', () => {
    const fourQuestions = JSON.parse(validResponse).slice(0, 4);
    const result = parseAssessment(JSON.stringify(fourQuestions));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'schema-failure');
    }
  });

  it('reports schema-failure when correctIndex is out of range', () => {
    const broken = JSON.parse(validResponse);
    broken[0].correctIndex = 4;
    const result = parseAssessment(JSON.stringify(broken));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'schema-failure');
      assert.ok(result.error.issues!.some((i) => i.path.includes('correctIndex')));
    }
  });

  it('reports schema-failure when the citation is missing', () => {
    const broken = JSON.parse(validResponse);
    broken[0].primarySourceCitation = '';
    const result = parseAssessment(JSON.stringify(broken));
    assert.equal(result.ok, false);
  });
});

describe('buildRetryFollowUp', () => {
  it('produces a usable follow-up for invalid-json', () => {
    const failure = {
      ok: false as const,
      error: { kind: 'invalid-json' as const, message: 'Unexpected token' },
    };
    const followUp = buildRetryFollowUp(failure);
    assert.match(followUp, /JSON/);
    assert.match(followUp, /no preamble/);
  });

  it('lists the schema issues in the follow-up', () => {
    const failure = {
      ok: false as const,
      error: {
        kind: 'schema-failure' as const,
        message: 'did not match',
        issues: [{ path: '0.correctIndex', message: 'invalid' }],
      },
    };
    const followUp = buildRetryFollowUp(failure);
    assert.match(followUp, /0\.correctIndex/);
    assert.match(followUp, /invalid/);
  });
});
