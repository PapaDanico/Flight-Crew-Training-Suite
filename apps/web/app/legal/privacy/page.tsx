import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Notice — DN Consultancy Aviation',
  description: 'How DNCA processes personal data under the Kenya Data Protection Act, 2019.',
};

export default function PrivacyNoticePage() {
  return (
    <LegalPage title="Privacy Notice" lastUpdated="29 May 2026" version="v0.1 (draft)">
      <p>
        This Privacy Notice explains how <strong>DN Consultancy Aviation (DNCA)</strong> collects,
        uses, shares and protects personal data through the Flight Crew Training Suite (the
        &ldquo;Platform&rdquo;), in accordance with the{' '}
        <strong>Kenya Data Protection Act, No. 24 of 2019 (the &ldquo;DPA&rdquo;)</strong> and the
        Data Protection (General) Regulations, 2021.
      </p>

      <LegalSection heading="1. Who we are (data controller)">
        <p>
          DNCA is the data controller for personal data it determines the purposes and means of
          processing. Where DNCA operates the Platform on behalf of an air operator (e.g. an AOC
          holder), that operator is the controller of its crew&rsquo;s personal data and DNCA acts
          as a <strong>data processor</strong> under a written agreement. DNCA is (or is in the
          process of) registering with the Office of the Data Protection Commissioner (ODPC).
        </p>
        <p>
          Contact for data-protection matters: the DNCA data-protection contact, via the
          operator&rsquo;s Accountable Manager or DNCA directly.
        </p>
      </LegalSection>

      <LegalSection heading="2. Personal data we process">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Identity &amp; licensing: name, pilot licence number, ELP level, passport/visa details.
          </li>
          <li>
            <strong>Health data (special category):</strong> the validity status and dates of the
            Class 1 medical certificate. We hold medical <em>status and dates only</em> — not
            clinical detail.
          </li>
          <li>
            Training &amp; checking records: sessions, CBTA competency grades, sign-offs, debriefs.
          </li>
          <li>Currency &amp; qualifications: computed statuses and expiry dates.</li>
          <li>
            Account &amp; audit data: user identity, role, and an immutable audit log of actions
            (actor, action, timestamp, IP) for accountability.
          </li>
        </ul>
        <p>
          We do not use real pilot data in demonstration or test environments — those use synthetic
          data only. The AI assessment feature does not include real pilot personal data in prompts.
        </p>
      </LegalSection>

      <LegalSection heading="3. Purposes &amp; lawful basis (DPA s.30)">
        <p>
          We process personal data to maintain regulatory currency and training records, to assure
          flight-crew competence, and to meet KCARs 2025 and KCAA oversight obligations. Our lawful
          bases are <strong>compliance with a legal obligation</strong>,{' '}
          <strong>legitimate interests</strong> in safe and compliant operations, and, where
          required for special-category (health) data, <strong>explicit consent</strong> or another
          DPA s.45 condition.
        </p>
      </LegalSection>

      <LegalSection heading="4. Who we share it with">
        <p>
          With the <strong>Kenya Civil Aviation Authority (KCAA)</strong> for inspection and
          oversight; with the relevant air operator (Heads of Training / Accountable Manager) for
          operational control; and with sub-processors strictly necessary to run the Platform
          (hosting). We do not sell personal data.
        </p>
      </LegalSection>

      <LegalSection heading="5. Retention">
        <p>
          Training records are retained for a <strong>minimum of five years</strong> per KCARs; some
          items for the lifetime of the licence. Flight-recorder data following an event is retained
          for 60 days. Audit-log entries are retained as immutable records. We retain personal data
          no longer than necessary for these purposes and applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights (DPA ss.26, 34–40)">
        <p>
          You have the right to be informed; to access your data; to rectification; to erasure; to
          restriction; to object; and to data portability. You may exercise these by contacting the
          data-protection contact above; a pilot&rsquo;s full record can be provided as a Pilot
          Training File export. Note that{' '}
          <strong>erasure is balanced against statutory retention</strong> — we may decline to
          delete records we are legally required to keep, with a documented basis, until the
          retention period lapses. You may lodge a complaint with the ODPC.
        </p>
      </LegalSection>

      <LegalSection heading="7. Security">
        <p>
          The Platform enforces tenant isolation at the database layer (row-level security),
          fail-closed authentication, role-based access control, rate limiting, and an append-only
          audit log. Access is logged and attributable. Personal data is hosted in-region (data
          residency) consistent with the DPA.
        </p>
      </LegalSection>

      <LegalSection heading="8. International transfers (DPA ss.48–49)">
        <p>
          Where personal data is transferred outside Kenya, we rely on an appropriate safeguard,
          adequacy, or your consent as required by the DPA, and we keep the AI proxy free of real
          personal data so model-provider calls are not a personal-data transfer.
        </p>
      </LegalSection>

      <LegalSection heading="9. Personal-data breaches (DPA s.43)">
        <p>
          In the event of a personal-data breach that risks your rights and freedoms, we will notify
          the Data Commissioner without undue delay and, where feasible, within 72 hours of becoming
          aware, and will notify affected individuals where there is a real risk of harm.
        </p>
      </LegalSection>

      <LegalSection heading="10. Cookies">
        <p>
          The Platform uses only strictly necessary cookies (e.g. an authentication session and a
          request-correlation identifier). It does not use advertising or third-party tracking
          cookies.
        </p>
      </LegalSection>

      <LegalSection heading="11. Changes">
        <p>
          We may update this Notice; the &ldquo;last updated&rdquo; date above reflects the current
          version. Material changes will be communicated through the Platform.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
