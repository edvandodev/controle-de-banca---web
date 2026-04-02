import { createClient } from '@supabase/supabase-js';
import { appEnv, isSupabaseConfigured } from '@/src/config/env';

export const isSupabaseEnabled =
  appEnv.dataProvider === 'supabase' && isSupabaseConfigured;

export const supabase = isSupabaseConfigured
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
