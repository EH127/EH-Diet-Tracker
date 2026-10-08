import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
// Missing or malformed configuration must never prevent local use.
function makeClient() {
  if (!url || !key) return null;
  try { return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
  catch { return null; }
}
export const supabase = makeClient();
