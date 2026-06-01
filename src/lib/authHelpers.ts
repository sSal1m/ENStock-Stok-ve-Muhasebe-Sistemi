import { createSupabaseServerClient } from './supabaseServer';
import { redirect } from 'next/navigation';

export type ActionType = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

/**
 * Sunucu tarafında (Server Components/Server Actions) yetki kontrolü yapar.
 * Yetkisi yoksa anasayfaya yönlendirir.
 * 
 * @param module Kontrol edilecek modül adı (örn: 'inventory', 'invoices')
 * @param action Kontrol edilecek eylem (örn: 'can_create', 'can_view')
 * @param redirectTo Yetkisiz erişimde yönlendirilecek URL (varsayılan: '/dashboard')
 */
export async function requirePermission(
  module: string,
  action: ActionType,
  redirectTo: string = '/dashboard'
) {
  const hasAccess = await checkPermission(module, action);
  
  if (!hasAccess) {
    redirect(redirectTo);
  }
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Sunucu tarafında kullanıcının yetkisini döndürür (Boolean).
 * Arayüzde buton gizlemek/disabled yapmak için kullanılabilir.
 */
export async function checkPermission(module: string, action: ActionType): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // 1. Önce kullanıcı bazlı (user.id) izinleri kontrol et (Bypass RLS)
  const { data: userPermission } = await supabaseAdmin
    .from('role_permissions')
    .select(action)
    .eq('role', user.id)
    .eq('module', module)
    .maybeSingle();

  if (userPermission) {
    return !!(userPermission as any)[action];
  }

  // 2. Profil tablosundan kullanıcının rolünü al (Bypass RLS for safety too, though not strictly required)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.role) return false;
  
  // Admin ise her şeye yetkisi vardır
  if (profile.role === 'admin') return true;

  // Rol izinleri tablosundan yetkiyi kontrol et (Bypass RLS)
  const { data: permission } = await supabaseAdmin
    .from('role_permissions')
    .select(action)
    .eq('role', profile.role)
    .eq('module', module)
    .maybeSingle();

  // İstediğimiz aksiyon sütunu (örn: can_create) true ise yetkilidir
  return permission ? !!(permission as any)[action] : false;
}
