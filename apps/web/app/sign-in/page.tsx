import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn, ShieldCheck } from 'lucide-react';
import { getAuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sign in — DN Consultancy Aviation',
  description: 'Access the Flight Crew Training Suite.',
};

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const provider = getAuthProvider();
  const configured = provider.isInteractive;
  const user = configured ? (await provider.getSession()).user : null;

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 ring-2 ring-amber-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-badge.png" alt="DNCA" className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-navy-900">Flight Crew Training Suite</h1>
            <p className="text-xs text-slate-500">DN Consultancy Aviation</p>
          </div>
        </div>

        {!configured ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                This environment runs in <strong>demo mode</strong> — open access to a synthetic
                dataset, no sign-in required. Single sign-on is enabled per operator deployment.
              </span>
            </div>
            <Link
              href="/"
              className="block w-full rounded bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-navy-800"
            >
              Continue to the dashboard
            </Link>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              You are signed in as <strong>{user.fullName}</strong>.
            </p>
            <Link
              href="/"
              className="block w-full rounded bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-navy-800"
            >
              Go to the dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Sign in with your operator single sign-on to access your crew&rsquo;s training
              records.
            </p>
            <a
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-amber-500 px-4 py-2.5 text-sm font-semibold text-navy-900 hover:bg-amber-400"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </a>
          </div>
        )}

        <p className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
          By continuing you agree to the{' '}
          <Link href="/legal/terms" className="underline hover:text-navy-700">
            Terms of Use
          </Link>{' '}
          and acknowledge the{' '}
          <Link href="/legal/privacy" className="underline hover:text-navy-700">
            Privacy Notice
          </Link>{' '}
          (Kenya DPA 2019).
        </p>
      </div>
    </div>
  );
}
