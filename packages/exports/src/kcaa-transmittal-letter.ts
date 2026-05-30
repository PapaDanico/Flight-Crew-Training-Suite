import {
  assessSubmissionReadiness,
  type DocumentKind,
  type IsoDate,
  type LetterOfEffectivePages,
  type Operator,
  type SubmissionReadiness,
} from '@dnca/domain';
import { REG_17_3, formatCitation } from '@dnca/ontology';

/**
 * KCAA transmittal-letter assembler. Composes the operator, the document
 * version, and a Reg 17(3) readiness assessment into the pure structure a
 * renderer turns into the cover letter that accompanies a manual submission
 * (CLAUDE.md §"KCAA submission flow", step 3). Logic-free formatting only;
 * presentation lives in apps/web.
 *
 * The body cites Reg 17(3) verbatim-anchored (30-day lead) and states the
 * planned implementation date, the computed submission deadline, the document
 * + version, and the Letter of Effective Pages summary. When the submission is
 * inside the 30-day window the letter carries an explicit override warning —
 * implementation before approval is prohibited regardless.
 */

const DEFAULT_AUTHORITY = 'The Director General, Kenya Civil Aviation Authority';

export interface KcaaTransmittalInput {
  operator: Operator;
  document: { title: string; shortCode: string; kind: DocumentKind };
  version: { versionLabel: string };
  plannedImplementation: IsoDate;
  asOf: IsoDate;
  signatory: { name: string; title: string };
  generatedAt: Date;
  /** Optional precomputed LEP for the version being submitted. */
  lep?: LetterOfEffectivePages;
  /** Defaults to the KCAA Director General. */
  authorityName?: string;
  /** Operator's own outgoing reference, if any. */
  reference?: string;
}

export interface KcaaTransmittalLetter {
  to: string;
  date: IsoDate;
  reference: string;
  subject: string;
  salutation: string;
  bodyParagraphs: ReadonlyArray<string>;
  closing: string;
  signatoryName: string;
  signatoryTitle: string;
  operatorName: string;
  aocNumber: string;
  regCitation: string;
  readiness: SubmissionReadiness;
  lepSummary: string | null;
  /** Present only when the submission is inside the 30-day window. */
  overrideWarning: string | null;
}

function isoDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10) as IsoDate;
}

export function buildKcaaTransmittalLetter(input: KcaaTransmittalInput): KcaaTransmittalLetter {
  const readiness = assessSubmissionReadiness({
    plannedImplementation: input.plannedImplementation,
    asOf: input.asOf,
  });
  const docRef = `${input.document.title} (${input.document.shortCode}), ${input.version.versionLabel}`;
  const lepSummary =
    input.lep && input.lep.pageCount > 0
      ? `The submission comprises ${input.lep.pageCount} effective page${
          input.lep.pageCount === 1 ? '' : 's'
        }${input.lep.effectiveDate ? `, effective ${input.lep.effectiveDate}` : ''}, as detailed in the attached Letter of Effective Pages.`
      : null;

  const bodyParagraphs: string[] = [
    `Pursuant to ${formatCitation(REG_17_3)}, ${input.operator.legalName} hereby submits ${docRef} for the approval of the Authority.`,
    `The amendment is intended to take effect on ${input.plannedImplementation}. In accordance with the thirty-day lead requirement, the submission deadline for this implementation date is ${readiness.submissionDeadline}.`,
  ];
  if (lepSummary) bodyParagraphs.push(lepSummary);
  bodyParagraphs.push(
    `The operator confirms that the proposed amendment will not be implemented before the Authority's approval is granted.`,
  );

  const overrideWarning = readiness.requiresOverride
    ? `This submission is being made ${Math.abs(readiness.daysUntilDeadline)} day(s) inside the thirty-day window required by Reg 17(3) (deadline was ${readiness.submissionDeadline}). It requires an explicit, audited override and the Authority may decline to consider it on the proposed timeline.`
    : null;

  return {
    to: input.authorityName ?? DEFAULT_AUTHORITY,
    date: isoDate(input.generatedAt),
    reference:
      input.reference ??
      `${input.operator.shortCode}/${input.document.shortCode}/${input.version.versionLabel}`,
    subject: `Submission for Approval — ${docRef}`,
    salutation: 'Dear Sir/Madam,',
    bodyParagraphs,
    closing: 'Yours faithfully,',
    signatoryName: input.signatory.name,
    signatoryTitle: input.signatory.title,
    operatorName: input.operator.legalName,
    aocNumber: input.operator.aocNumber,
    regCitation: formatCitation(REG_17_3),
    readiness,
    lepSummary,
    overrideWarning,
  };
}

export function kcaaTransmittalFilenameStem(operator: Operator, asOf: IsoDate): string {
  const safe = operator.shortCode.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `kcaa-transmittal_${safe}_${asOf}`;
}
