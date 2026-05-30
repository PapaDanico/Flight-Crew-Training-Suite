import { F70_100_PROFILE, isProductionReady, type AircraftTypeProfile } from '@dnca/domain';
import {
  EASA_AMC1_ORO_FC_220,
  EASA_AMC1_ORO_FC_230,
  ICAO_DOC_9868,
  LN_29_2026,
  LN_42_2026,
  REG_17_3,
  REG_15_2,
  REG_FDAP_LN42,
  formatCitation,
} from '@dnca/ontology';

/**
 * Static system-prompt calibration block builder.
 *
 * The block is now built per-AircraftTypeProfile. The F70/100 profile
 * produces the same block the platform shipped with originally (ADR 0006
 * preserves this invariant). Preview profiles (B737 et al.) that have
 * not yet been populated by a TRI/TRE produce a generic examiner role
 * without inventing type-specific technical claims.
 *
 * The block is still designed for Anthropic prompt-cache eligibility —
 * the F70/100 path comfortably exceeds the 1024-token minimum.
 */

export function buildCalibrationSystemBlock(
  profile: AircraftTypeProfile = F70_100_PROFILE,
): string {
  if (!isProductionReady(profile)) {
    return buildPreviewSystemBlock(profile);
  }
  return buildProductionReadySystemBlock(profile);
}

/**
 * Back-compat export. Equal to buildCalibrationSystemBlock(F70_100_PROFILE).
 */
export const F70_100_CALIBRATION_SYSTEM_BLOCK = buildCalibrationSystemBlock(F70_100_PROFILE);

function buildProductionReadySystemBlock(profile: AircraftTypeProfile): string {
  const m = profile.manufacturerFacts;
  const op = profile.operationalProfile;
  const variantSummary = m.variants
    .map((v) => `${v.label} MTOW ${v.mtowKg.toLocaleString()} kg`)
    .join('; ');
  const flapPolicy = op.takeoffFlapPolicy;
  const landingFlaps = op.landingFlaps ?? [];

  return `
${profile.aiCalibration.examinerRoleDescription}

Your candidates fly for East African operators (Jubba Airways Kenya,
I-Fly Air Solutions) under operations subject to ${formatCitation({ instrument: LN_29_2026 })}.

# ${profile.longLabel} — authoritative technical facts

These facts are non-negotiable. Questions that contradict them are wrong.

- Engine: ${m.engineDesignation}
${m.apuDesignation ? `- APU: ${m.apuDesignation}\n` : ''}${m.hydraulicSystemsCount !== undefined ? `- ${m.hydraulicSystemsCount} independent hydraulic systems\n` : ''}- Variants: ${variantSummary}
${flapPolicy ? `- Takeoff flap convention: Flaps ${flapPolicy.default} = default; Flaps ${flapPolicy.performance} = performance; Flaps ${flapPolicy.reserved} = reserved. Flaps ${flapPolicy.prohibitedOnContaminatedRunway} PROHIBITED on contaminated runways.${flapPolicy.tocwsAlertsOnFlapZero ? '' : ' TOCWS does NOT alert for Flaps 0 — EICAS confirmation discipline mandatory.'}\n` : ''}${op.oei ? `- OEI technique: ${op.oei.technique} with ${op.oei.bankIntoLiveEngineDeg}° bank into the live engine\n` : ''}${op.approachSpeedSource ? `- Approach speeds: ${op.approachSpeedSource}\n` : ''}${op.maxFuelAsymmetryKgEnroute !== undefined ? `- Max fuel asymmetry en-route: ${op.maxFuelAsymmetryKgEnroute.toLocaleString()} kg\n` : ''}${landingFlaps.length > 0 ? `- Landing flaps: ${landingFlaps.join(' or ')}\n` : ''}${op.decisionFramework ? `- Decision framework: ${op.decisionFramework} — supersedes FORDEC; do not reintroduce FORDEC\n` : ''}- Grading scale: AS / S / MS / BS (operator convention). ICAO Doc 9868 PANS-TRG uses 1-5.
${op.notes ? `\n${op.notes}\n` : ''}
# Regulatory anchors that must be cited correctly

- ${formatCitation(REG_17_3)} — 30-day pre-implementation submission window
- ${formatCitation(REG_15_2)} — Human Factors principles statutory for checklist design
- ${formatCitation(REG_FDAP_LN42)} — FDAP mandatory for aircraft > 27,000 kg MTOW
- ${formatCitation({
    instrument: LN_42_2026,
    section: 'Third Schedule',
    subject:
      'Binding OM content list — §2.1 General (39), §2.2 Aircraft operating information (13), §2.3 Routes/aerodromes (6), §2.4 Training (3)',
  })}
- ${formatCitation({ instrument: EASA_AMC1_ORO_FC_220 })} and
  ${formatCitation({ instrument: EASA_AMC1_ORO_FC_230 })} — conversion and
  recurrent training and checking
- ${formatCitation({ instrument: ICAO_DOC_9868, section: '§4.5.1' })} — Base
  training on actual aircraft mandatory post-Skills Test when ZFTT unavailable

# Question quality requirements

Each question must:

1. Test a clearly-named cognitive objective — recall, comprehension,
   application, or analysis (Bloom). Vary across the set; do not produce
   five recall questions.
2. Be technically precise. Pilots will be re-checked on these. Ambiguity
   that lets two answers be defensible is a defect.
3. Carry FOUR options. Exactly ONE is correct.
4. Distractors are plausible — common misconceptions held by type-rated
   pilots, regulatory near-neighbours from other frameworks, or
   partial-knowledge traps. Distractors are NEVER nonsense, obviously
   wrong, or comically extreme.
5. Include an explanation that names the correct answer, briefly says why
   the distractors are wrong, and cites a primary source (KCARs / ICAO /
   FAA / EASA / OM / QRH / AFM / Doc 9868 §). If you do not know the
   section, say so and pick a distractor that would have been correct —
   never invent a citation.
6. Never contain real or plausibly-real pilot names, employee IDs, licence
   numbers, or aircraft registrations. Use the operator convention:
   "Captain Alpha One", "First Officer Bravo Two", etc.

# Output format

Respond ONLY with a JSON array. No preamble, no commentary, no markdown
code fences. The array contains exactly five objects matching:

[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0 | 1 | 2 | 3,
    "explanation": "string with reasoning + distractor analysis",
    "primarySourceCitation": "string e.g. 'KCARs LN 42/2026 Third Schedule §2.1.25', 'ICAO Doc 9868 §4.5.1', 'AFM §3.05.10', 'QRH ENG-FIRE'"
  },
  ... 4 more ...
]

Failure to produce valid JSON, fewer or more than five questions, or
malformed structure will be re-prompted up to two times before the
generation surfaces a structured error to the operator.
`.trim();
}

function buildPreviewSystemBlock(profile: AircraftTypeProfile): string {
  return `
${profile.aiCalibration.examinerRoleDescription}

Your candidates fly for East African operators under operations subject to
${formatCitation({ instrument: LN_29_2026 })}.

# Calibration status

The ${profile.longLabel} profile is in **preview**. Operational technique
(OEI procedures, fuel-asymmetry limits, takeoff flap policy, landing
flap selection) and detailed AI calibration have not yet been populated
by a TRI/TRE qualified on type. Do NOT invent type-specific technical
claims. When a question would require a specific operational figure,
either (a) frame the question generically (e.g. "applicable OEI
technique per the operator OM-B" rather than naming a procedure), or
(b) choose a different topic.

You MAY rely on:
- Public manufacturer facts (engine designation, MTOW per variant)
- Regulatory anchors below (KCARs / ICAO / FAA / EASA — type-agnostic)
- Generic CRM, TEM, and decision-making content
- Generic operational principles applicable across modern transport
  category aircraft

# Manufacturer facts (public spec)

- Engine: ${profile.manufacturerFacts.engineDesignation}
${profile.manufacturerFacts.variants
  .map((v) => `- ${v.label}: MTOW ${v.mtowKg.toLocaleString()} kg`)
  .join('\n')}

# Regulatory anchors

- ${formatCitation(REG_17_3)} — 30-day pre-implementation submission
- ${formatCitation(REG_15_2)} — Human Factors in checklist design
- ${formatCitation(REG_FDAP_LN42)} — FDAP mandatory > 27,000 kg MTOW
- ${formatCitation({
    instrument: LN_42_2026,
    section: 'Third Schedule',
  })}

# Question quality requirements

Each question must:

1. Test a clearly-named cognitive objective.
2. Carry FOUR options. Exactly ONE is correct.
3. Distractors are plausible (not nonsense).
4. Include an explanation that cites a primary source (KCARs / ICAO /
   FAA / EASA). If you would need a type-specific source (AFM / QRH)
   that you cannot cite, do not pose the question — change the topic.
5. Never contain real or plausibly-real pilot PII. Use "Captain Alpha
   One" / "First Officer Bravo Two".

# Output format

Respond ONLY with a JSON array of exactly five MCQ objects, as before.
`.trim();
}
