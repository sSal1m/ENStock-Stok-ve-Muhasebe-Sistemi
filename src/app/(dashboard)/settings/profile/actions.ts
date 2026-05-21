'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function getAdminBusinessAddress(adminId: string) {
  if (!adminId) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(adminId);
    if (error || !data.user) return null;
    return data.user.user_metadata?.business_address || null;
  } catch (error) {
    console.error("Error fetching admin address:", error);
    return null;
  }
}
