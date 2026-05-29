import {
  getSignInUrl as workosGetSignInUrl,
  signOut as workosSignOut,
  withAuth,
} from '@workos-inc/authkit-nextjs';
import type { AuthProvider, AuthSession } from './types.js';

/**
 * WorkOS AuthKit implementation of the auth seam. The only file in the web app
 * that imports the WorkOS SDK (besides the edge middleware, which is
 * necessarily provider-specific).
 */
export const workosProvider: AuthProvider = {
  kind: 'workos',
  isInteractive: true,

  async getSession(): Promise<AuthSession> {
    try {
      const { user, accessToken } = await withAuth();
      if (!user) return { user: null, accessToken: null };
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        },
        accessToken: accessToken ?? null,
      };
    } catch {
      // withAuth throws outside a request context (e.g. Next static probe).
      return { user: null, accessToken: null };
    }
  },

  async getSignInUrl(): Promise<string> {
    return workosGetSignInUrl();
  },

  async signOut(): Promise<void> {
    await workosSignOut();
  },
};
