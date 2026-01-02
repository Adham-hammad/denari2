
import { createClient } from '@supabase/supabase-js';

// Access environment variables securely via import.meta.env
// We handle the case where import.meta.env might be undefined to prevent runtime crashes
const env = import.meta.env || {};
// @ts-ignore
const supabaseUrl = env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key is missing!');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
