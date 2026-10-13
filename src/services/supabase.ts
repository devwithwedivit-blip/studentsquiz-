import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client singleton
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : (null as unknown as SupabaseClient);

export function getEdgeFunctionUrl(functionName: string): string {
  if (!supabaseUrl) return '';
  // Supabase edge functions URL format: https://<project-ref>.supabase.co/functions/v1/<functionName>
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`;
}
