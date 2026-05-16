"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { ActionType } from "./authHelpers";

/**
 * İstemci tarafında (Client Components) yetki kontrolü yapmak için Hook.
 * Kullanımı: const { hasPermission, loading } = usePermission('stock', 'can_create');
 */
export function usePermission(module: string, action: ActionType) {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasPermission(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || !profile.role) {
          setHasPermission(false);
          return;
        }

        if (profile.role === 'admin') {
          setHasPermission(true);
          return;
        }

        const { data: permission } = await supabase
          .from('role_permissions')
          .select(action)
          .eq('role', profile.role)
          .eq('module', module)
          .single();

        setHasPermission(permission ? !!(permission as any)[action] : false);
      } catch (err) {
        console.error("Yetki kontrolü hatası:", err);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [module, action]);

  return { hasPermission, loading };
}
