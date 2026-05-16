'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface UpdateRolePermissionResult {
  success: boolean;
  error?: string;
}

export async function updateRolePermissionAction(
  role: string,
  module: string,
  permissions: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }
): Promise<UpdateRolePermissionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Güvenlik: Yapan kişi admin mi kontrolü eklenebilir
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) throw new Error("Yetkisiz");

    const { error } = await supabase
      .from('role_permissions')
      .upsert({
        role,
        module,
        can_view: permissions.can_view,
        can_create: permissions.can_create,
        can_edit: permissions.can_edit,
        can_delete: permissions.can_delete
      }, { onConflict: 'role,module' });

    if (error) {
      console.error('Supabase Permission Upsert Hatası:', error);
      return { success: false, error: 'Veritabanına kaydedilemedi.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateRolePermissionAction] Beklenmeyen hata:', err);
    return { success: false, error: err.message || 'Sunucu hatası oluştu.' };
  }
}
