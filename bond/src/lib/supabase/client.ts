'use client';

import { createBrowserClient } from '@supabase/ssr';
import { clientEnv } from '@/lib/env';

/**
 * Browser Supabase client (production path). Returns null in DEMO_MODE so the app
 * falls back to the local demo store. Wire real auth/data by filling in env vars.
 */
export function getSupabaseBrowser() {
  if (clientEnv.demoMode || !clientEnv.supabaseUrl || !clientEnv.supabaseAnonKey) return null;
  return createBrowserClient(clientEnv.supabaseUrl, clientEnv.supabaseAnonKey);
}
