import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in environment variables.');
}

// Browser client'ı SSR paketi ile oluştur - session persistence otomatik olur
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

