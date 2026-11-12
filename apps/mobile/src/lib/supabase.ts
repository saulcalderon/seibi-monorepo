import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { sessionStorage } from '@/auth/device';

import type { Database } from './database.types';

// Inlined at build time from the EAS environment of the build profile, or
// from apps/mobile/.env.local on a developer's machine (see .env.example).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. ' +
      'Copy apps/mobile/.env.example to .env.local, or set them in the EAS environment.',
  );
}

/**
 * The one Supabase client. The same project and users as the PWA. Tables are
 * typed by `database.types.ts`, generated from seibi-dev's schema
 * (ARCHITECTURE.md → Data).
 */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    // Keeps Supabase's answers out of the system HTTP cache. Without it, iOS
    // writes them to Library/Caches/<bundle id>/Cache.db in plain text:
    // the sign-in answer with its access and refresh tokens, the account,
    // later the person's Vehicles. That would undo the sealed session and
    // outlive sign-out.
    headers: { 'Cache-Control': 'no-store' },
  },
});

// The access token refreshes only while the app is in front. Coming back
// starts the timer again, and it refreshes at once if the token expired in
// the background.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
