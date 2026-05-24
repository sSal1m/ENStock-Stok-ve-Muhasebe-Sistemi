'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface VerifyInviteResult {
  success: boolean;
  isRegistered?: boolean;
  message?: string;
}

export async function verifyEmployeeInviteAction(
  email: string,
  code: string,
): Promise<VerifyInviteResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Daveti sorgula
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, otp_code, is_accepted, expires_at')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (fetchError || !invitation) {
      return { success: false, message: 'Bu e-posta adresi için herhangi bir davet bulunamadı.' };
    }

    // 2. OTP Kodu eşleşiyor mu?
    if (invitation.otp_code !== code.trim()) {
      return { success: false, message: 'Girdiğiniz davet kodu hatalı. Lütfen kontrol edip tekrar deneyin.' };
    }

    // 3. Zaten kabul edilmiş mi? (Kullanıcı kayıtlı)
    if (invitation.is_accepted === true) {
      return {
        success: false,
        message: 'Bu davet kodu zaten kullanılmış. Lütfen "Normal Giriş" sekmesinden e-posta ve şifrenizle giriş yapın.',
      };
    }

    // 4. Süresi geçmiş mi?
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (now > expiresAt) {
      return { success: false, message: 'Bu davet kodunun süresi dolmuş. Lütfen yöneticinizden yeni bir davet talep edin.' };
    }

    // Kod geçerli ve henüz kayıt tamamlanmamış
    return { success: true, isRegistered: false };
  } catch (err) {
    console.error('[verifyEmployeeInviteAction] Hata:', err);
    return { success: false, message: 'Sunucu hatası oluştu. Lütfen tekrar deneyin.' };
  }
}
