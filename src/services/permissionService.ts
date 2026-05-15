
import { supabase } from '@/lib/supabaseClient';

export interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export async function getRolePermissions(role: string): Promise<Record<string, Permission>> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', role);

  if (error) {
    console.error('Error fetching permissions:', error);
    return {};
  }

  const permissions: Record<string, Permission> = {};
  data.forEach((p) => {
    permissions[p.module] = p;
  });

  return permissions;
}

export async function checkPermission(role: string, module: string, action: 'view' | 'create' | 'edit' | 'delete'): Promise<boolean> {
  // Admin has all permissions
  if (role === 'admin') return true;

  const { data, error } = await supabase
    .from('role_permissions')
    .select(`can_${action}`)
    .eq('role', role)
    .eq('module', module)
    .maybeSingle();

  if (error || !data) return false;
  return (data as any)[`can_${action}`];
}
