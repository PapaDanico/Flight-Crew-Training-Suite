import { LogIn, LogOut, User } from 'lucide-react';
import { getAuthProvider } from '@/lib/auth';

/**
 * Header auth widget. Provider-agnostic — talks only to the auth seam.
 *
 *  - Interactive provider + signed in → name + sign-out form
 *  - Interactive provider + signed out → sign-in link
 *  - Non-interactive (demo) provider → muted "demo mode" pill
 *
 * Server Component: all secret material stays server-side. The sign-out
 * form posts to a Server Action so we don't ship a route handler just to
 * clear a cookie.
 */
export async function AuthStatus() {
  const provider = getAuthProvider();

  if (!provider.isInteractive) {
    return (
      <span className="rounded border border-slate-600 bg-navy-800 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
        Demo mode
      </span>
    );
  }

  const { user } = await provider.getSession();

  if (!user) {
    // Route Handler /login mints the PKCE cookie + sign-in URL; Server
    // Components can't write cookies, so we link rather than resolve here.
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-1.5 rounded border border-amber-500 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-amber-400"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded border border-slate-600 bg-navy-800 px-2.5 py-1.5 text-xs text-slate-200">
        <User className="h-3.5 w-3.5" />
        {user.fullName}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded border border-slate-600 bg-navy-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-navy-700"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </form>
    </div>
  );
}

async function signOut() {
  'use server';
  await getAuthProvider().signOut();
}
