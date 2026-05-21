'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading } = usePermissions();

  const isAdmin = role === 'admin';

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Yönetici olmayan kullanıcıları admin-only ayar sayfalarından yönlendir
  useEffect(() => {
    if (isLoading) return;

    const adminOnlyPaths = ['/settings/business', '/settings/users'];
    const isAdminOnlyPage = adminOnlyPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );

    if (isAdminOnlyPage && !isAdmin) {
      router.push('/settings/profile');
    }
  }, [pathname, isAdmin, isLoading, router]);

  return (
    <div className="flex flex-col gap-6">
      {/* Settings Navigation Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <Link
          href="/settings/profile"
          className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            isActive('/settings/profile')
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">person</span>
            Profil
          </span>
        </Link>

        {isAdmin && (
          <>
            <Link
              href="/settings/business"
              className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive('/settings/business')
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">business</span>
                İşletme
              </span>
            </Link>

            <Link
              href="/settings/users"
              className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive('/settings/users')
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">people</span>
                Kullanıcılar
              </span>
            </Link>

            <Link
              href="/settings/users/roles"
              className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive('/settings/users/roles')
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                Roller
              </span>
            </Link>

            <Link
              href="/settings/users/new"
              className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive('/settings/users/new')
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">person_add</span>
                Üye Davet Et
              </span>
            </Link>
          </>
        )}
      </div>

      {/* Settings Content */}
      <div>{children}</div>
    </div>
  );
}

