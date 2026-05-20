
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getRolePermissions, Permission } from '@/services/permissionService';

export function usePermissions() {
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            setRole(profile.role);
            // 1. Önce kullanıcı bazlı (user.id) izinleri yükle
            let perms = await getRolePermissions(user.id);
            
            // 2. Kullanıcı bazlı izin tanımlı değilse, rol varsayılanlarını yükle
            if (Object.keys(perms).length === 0) {
              perms = await getRolePermissions(profile.role);
            }
            setPermissions(perms);
          }
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPermissions();
  }, []);

  const hasPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (role === 'admin') return true;
    const modulePerms = permissions[module];
    if (!modulePerms) return false;
    return modulePerms[`can_${action}` as keyof Permission] === true;
  };

  return { role, permissions, hasPermission, isLoading };
}
