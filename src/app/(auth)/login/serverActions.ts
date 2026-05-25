'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Bilgilerinizi kontrol edin' };
      }
      if (error.message.includes('User not found')) {
        return { success: false, error: 'E-posta adresi bulunamadı' };
      }
      if (error.message.includes('Refresh Token Not Found')) {
        return { success: false, error: 'Oturum yönetiminde sorun oluştu. Lütfen tekrar deneyin.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Giriş başarısız' };
    }

    return { success: true };
  } catch (err) {
    console.error('[loginAction] Hata:', err);
    return { success: false, error: 'Sunucu hatası oluştu' };
  }
}
