export type DataProvider = 'local' | 'supabase';

function normalizeProvider(value: string | undefined): DataProvider {
  return value === 'supabase' ? 'supabase' : 'local';
}

export const appEnv = {
  appName: import.meta.env.VITE_APP_NAME || 'Controle de Banca',
  dataProvider: normalizeProvider(import.meta.env.VITE_DATA_PROVIDER),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

export const isSupabaseConfigured =
  Boolean(appEnv.supabaseUrl) && Boolean(appEnv.supabaseAnonKey);
