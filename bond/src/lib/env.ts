/**
 * Central environment + capability detection.
 *
 * DEMO_MODE is the backbone of the MVP: with no Supabase credentials the whole app
 * runs on local mock adapters and a seeded, localStorage-backed store. It can be
 * forced on/off with NEXT_PUBLIC_DEMO_MODE, otherwise it auto-enables when Supabase
 * env vars are missing.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const explicit = process.env.NEXT_PUBLIC_DEMO_MODE;

export const DEMO_MODE: boolean =
  explicit === 'true' ? true : explicit === 'false' ? false : !(supabaseUrl && supabaseAnonKey);

export const clientEnv = {
  supabaseUrl,
  supabaseAnonKey,
  googleOAuthEnabled: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true',
  demoMode: DEMO_MODE,
};

/** Server-only secrets. Never import into a Client Component. */
export const serverEnv = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
  hasPlaces: Boolean(process.env.GOOGLE_PLACES_API_KEY),
};
