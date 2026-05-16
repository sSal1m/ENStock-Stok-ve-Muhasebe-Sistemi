'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface RegisterInvitedUserResult {
  success: boolean;
  error?: string;
}

/**
 * Davet edilen çalışanın OTP kodunu doğrulayıp Supabase Auth kaydını oluşturur.
 *
 * Kontrol sırası:
 *  1. public.invitations tablosunda e-posta var mı?
 *  2. otp_code eşleşiyor mu?
 *  3. is_accepted = false mu? (daha önce kabul edilmemiş)
 *  4. expires_at henüz geçmemiş mi?
 *  5. Hepsi OK → auth.signUp tetikle + is_accepted = true yap
 */
export async function registerInvitedUserAction(
  email: string,
  full_name: string,
  password: string,
  otp_code: string,
): Promise<RegisterInvitedUserResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // ── 1. Daveti sorgula ────────────────────────────────────────────────────
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, otp_code, is_accepted, expires_at, business_id, role')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (fetchError || !invitation) {
      console.error('Supabase Davet Sorgu Hatası:', fetchError);
      return { success: false, error: 'Bu e-posta adresi için aktif bir davet bulunamadı.' };
    }

    // ── 2. OTP kodu kontrolü ─────────────────────────────────────────────────
    if (invitation.otp_code !== otp_code.trim()) {
      return { success: false, error: 'Girdiğiniz kod hatalı. Lütfen tekrar deneyin.' };
    }

    // ── 3. Daha önce kabul edilmiş mi? ───────────────────────────────────────
    if (invitation.is_accepted === true) {
      return { success: false, error: 'Bu davet kodu zaten kullanılmış. Lütfen giriş yapmayı deneyin.' };
    }

    // ── 4. Süre kontrolü ─────────────────────────────────────────────────────
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (now > expiresAt) {
      return { success: false, error: 'Davet kodunuzun süresi dolmuş. Yöneticinizden yeni davet talep edin.' };
    }

    // ── 5. Supabase Auth kaydı ───────────────────────────────────────────────
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: full_name.trim(),
          business_id: invitation.business_id ?? null,
          role: invitation.role ?? 'employee',
        },
        // E-posta doğrulaması istemiyorsak emailRedirectTo'yu kaldırın
        // emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      },
    });

    if (signUpError) {
      // Rate-limit mesajını Türkçeleştir
      if (signUpError.message.toLowerCase().includes('rate limit')) {
        return { success: false, error: 'Çok fazla deneme yapıldı. Lütfen 1 saat bekleyin.' };
      }
      if (signUpError.message.toLowerCase().includes('already registered')) {
        return { success: false, error: 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.' };
      }
      return { success: false, error: `Kayıt hatası: ${signUpError.message}` };
    }

    if (!signUpData.user) {
      return { success: false, error: 'Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.' };
    }

    // ── 6. Daveti kabul edildi olarak işaretle ───────────────────────────────
    await supabase
      .from('invitations')
      .update({ is_accepted: true })
      .eq('id', invitation.id);

    return { success: true };
  } catch (err) {
    console.error('[registerInvitedUserAction] Beklenmeyen hata:', err);
    return { success: false, error: 'Sunucu hatası oluştu. Lütfen tekrar deneyin.' };
  }
}
