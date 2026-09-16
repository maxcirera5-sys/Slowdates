import 'server-only';
import { serverEnv } from '@/lib/env';

/**
 * Privileged (service-role) admin client factory for server-side flows such as
 * full account deletion (brief §14). Only constructed when the service-role key is
 * present; never import this into a Client Component.
 */
export async function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !serverEnv.supabaseServiceRoleKey) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, serverEnv.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
