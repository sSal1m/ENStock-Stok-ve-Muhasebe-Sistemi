
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { usePermissions } from '@/hooks/usePermissions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { hasPermission, isLoading: permsLoading, role } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsAuthenticated(true);

          // Davet ile gelen kullanıcı pending durumunda ise aktif yap
          await supabase
            .from('profiles')
            .update({ status: 'active' })
            .eq('id', user.id)
            .eq('status', 'pending');
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Permissions yüklenince route bazlı kontrol yap
  useEffect(() => {
    if (permsLoading || !isAuthenticated) return;

    const pathname = window.location.pathname;
    const getModuleId = (path: string) => {
      if (path.includes('/inventory')) return 'stock';
      if (path.includes('/contacts')) return 'contacts';
      if (path.includes('/invoices')) return 'invoices';
      if (path.includes('/reports')) return 'reports';
      if (path.includes('/quotes')) return 'quotes';
      if (path.includes('/settings/users')) return 'users';
      return null;
    };

    const moduleId = getModuleId(pathname);

    if (moduleId === 'users' && role !== 'admin') {
      router.push('/unauthorized');
      return;
    }
    if (moduleId && moduleId !== 'users' && !hasPermission(moduleId, 'view')) {
      router.push('/unauthorized');
    }
  }, [permsLoading, isAuthenticated, role, hasPermission, router]);

  if (isLoading || permsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-surface-container rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
          <p className="text-on-surface/60">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
