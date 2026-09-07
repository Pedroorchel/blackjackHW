import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://zitqwwgjjmecoklmpzqt.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IwzMMGh7Ezd04LhmpeibfQ_9EPW-9e_';

// Auto-clean URL to prevent "Invalid path specified in request URL"
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim();
  if (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }
  if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  if (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

