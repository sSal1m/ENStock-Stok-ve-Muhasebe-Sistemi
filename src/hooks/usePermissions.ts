
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Permission } from '@/services/permissionService';
import { fetchUserPermissionsAction } from '@/app/(dashboard)/teamActions';

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
            
            // Use Server Action to fetch permissions and bypass RLS
            const result = await fetchUserPermissionsAction(user.id, profile.role);
            
            if (result.success) {
              const rMatrix: Record<string, Permission> = {};
              result.rolePerms?.forEach((p: any) => { rMatrix[p.module] = p; });
              
              const uMatrix: Record<string, Permission> = {};
              result.userPerms?.forEach((p: any) => { uMatrix[p.module] = p; });
              
              setPermissions({ ...rMatrix, ...uMatrix });
            }
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
