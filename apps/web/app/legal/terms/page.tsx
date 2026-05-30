import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Use — DN Consultancy Aviation',
  description: 'Terms governing access to and use of the DNCA Flight Crew Training Suite.',
};

export default function TermsOfUsePage() {
  return (
    <LegalPage title="Terms of Use" lastUpdated="29 May 2026" version="v0.1 (draft)">
      <p>
        These Terms of Use (&ldquo;Terms&rdquo;) govern access to and use of the Flight Crew
        Training Suite (the &ldquo;Platform&rdquo;) provided by{' '}
        <strong>DN Consultancy Aviation (DNCA)</strong>. By accessing the Platform you agree to
        these Terms. If you access on behalf of an air operator, you confirm you are authorised to
        bind that operator.
      </p>

      <LegalSection heading="1. The service">
        <p>
          The Platform is a multi-tenant flight-crew training and currency management system,
          configured per operator and anchored to KCARs 2025. It is provided as part of a
          forward-deployed consultancy engagement and is proprietary to DNCA.
        </p>
      </LegalSection>

      <LegalSection heading="2. Accounts &amp; access">
        <p>
          Access requires an authorised account. You are responsible for safeguarding your
          credentials and for activity under your account. Access is role-based; you must only use
          access granted to you and only for the operator(s) you are authorised to act for. Attempts
          to access another operator&rsquo;s data are prohibited.
        </p>
      </LegalSection>

      <LegalSection heading="3. Acceptable use">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Use the Platform only for lawful flight-crew training, currency and compliance purposes.
          </li>
          <li>Do not attempt to circumvent tenant isolation, authentication, or the audit log.</li>
          <li>
            Do not upload unlawful content or real personal data into demonstration environments.
          </li>
          <li>Do not misrepresent training, checking, or currency records.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Data protection">
        <p>
          DNCA processes personal data in accordance with the{' '}
          <Link href="/legal/privacy" className="underline hover:text-navy-700">
            Privacy Notice
          </Link>{' '}
          and the Kenya Data Protection Act, 2019. Where DNCA processes personal data on an
          operator&rsquo;s behalf, a separate data-processing agreement governs that relationship.
        </p>
      </LegalSection>

      <LegalSection heading="5. Records, audit &amp; regulatory integrity">
        <p>
          The Platform maintains an immutable, append-only audit log; you acknowledge that actions
          are recorded for regulatory accountability. Training and currency records may be retained
          to meet statutory minimums (generally five years) regardless of account status.
        </p>
      </LegalSection>

      <LegalSection heading="6. Regulatory information — no substitute for the source">
        <p>
          Regulatory citations and computed statuses are provided to assist compliance and are
          sourced to primary instruments where shown. They are <strong>not legal advice</strong> and
          do not replace the operator&rsquo;s approved Operations Manual, the gazetted regulations,
          or the determinations of the KCAA. The operator remains responsible for its compliance.
        </p>
      </LegalSection>

      <LegalSection heading="7. Intellectual property">
        <p>
          The Platform, its content and its design are owned by DNCA or its licensors. No right is
          granted other than the limited, non-transferable right to use the Platform per these Terms
          and the applicable engagement.
        </p>
      </LegalSection>

      <LegalSection heading="8. Availability &amp; warranties">
        <p>
          The Platform is provided on a reasonable-efforts basis and, during development, may change
          or be unavailable. To the maximum extent permitted by law, it is provided &ldquo;as
          is&rdquo; without warranties of any kind. Nothing in these Terms limits liability that
          cannot be limited under Kenyan law.
        </p>
      </LegalSection>

      <LegalSection heading="9. Suspension &amp; termination">
        <p>
          DNCA may suspend or withdraw access for breach of these Terms or to protect the Platform
          or its users. On termination, retention and export obligations continue per the Privacy
          Notice and applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="10. Governing law">
        <p>
          These Terms are governed by the laws of the Republic of Kenya, and disputes are subject to
          the jurisdiction of the Kenyan courts.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about these Terms may be directed to DNCA via the operator&rsquo;s Accountable
          Manager or DNCA directly.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
