import { createClient } from '@supabase/supabase-js';

export const GOOGLE_OAUTH_PENDING_KEY = 'offertgames_google_oauth_pending';
export const GOOGLE_OAUTH_ACCOUNT_KEY = 'offertgames_google_oauth_account';
export const GOOGLE_OAUTH_CODE_SENT_KEY = 'offertgames_google_oauth_code_sent';
export const GOOGLE_OAUTH_VERIFIED_USER_KEY = 'offertgames_google_oauth_verified_user';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-url') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key') &&
  !supabaseAnonKey.includes('...')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
