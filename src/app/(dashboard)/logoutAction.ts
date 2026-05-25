'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
