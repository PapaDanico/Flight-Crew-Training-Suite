import type { AuthProvider } from './types.js';

/**
 * Demo / open-access provider. No real sign-in: the app serves a synthetic
 * dataset and the API is reached via the demo operator header (see
 * api-config). Keeps the platform runnable with zero auth config for design
 * work, CI, and the Vercel preview.
 */
export const demoProvider: AuthProvider = {
  kind: 'demo',
  isInteractive: false,

  async getSession() {
    return { user: null, accessToken: null };
  },

  async getSignInUrl() {
    // No hosted IdP in demo mode; the sign-in page routes onward to the app.
    return '/';
  },

  async signOut() {
    // No session to clear.
  },
};
