import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env: Record<string, any> =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env
    : (globalThis as any).process?.env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
