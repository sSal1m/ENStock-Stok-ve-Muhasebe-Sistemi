import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing in environment variables.');
}

// DİKKAT: Bu client sadece sunucu tarafında (Server Components, API Routes, Server Actions) kullanılmalıdır.
// Row Level Security (RLS) kurallarını bypass eder (göz ardı eder) ve tüm verilere tam erişim sağlar.
// Asla client-side (tarayıcı) kodlarında (örneğin "use client" olan sayfalarda) KULLANILMAMALIDIR!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
