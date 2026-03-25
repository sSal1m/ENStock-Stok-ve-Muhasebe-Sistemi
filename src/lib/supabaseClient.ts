import { createClient } from '@supabase/supabase-js';
// 1. database.types.ts dosyasını oluşturduktan sonra aşağıdaki yorum satırını kaldırarak import edin:
// import { Database } from '../database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in environment variables.');
}

// 2. Database generic tipini (Database) oluşturduktan sonra aşağıdaki şekilde kullanabilirsiniz:
// export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
