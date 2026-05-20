'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import GlobalSearch from './GlobalSearch';

interface UserProfile {
  full_name: string;
  company_name: string;
  role?: string;
}

// Path to page title mapping
const pathTitleMap: Record<string, string> = {
  '/inventory': 'Stok Kontrol Paneli',
  '/inventory/new': 'Yeni Ürün Ekle',
  '/inventory/[id]': 'Ürün Detayı',
  '/inventory/[id]/edit': 'Ürünü Düzenle',
  '/dashboard': 'Genel Bakış',
  '/sales': 'Satış Yönetimi',
  '/contacts': 'Cari Hesap Rehberi',
  '/contacts/[id]': 'Cari Hesap Detayı',
  '/invoices': 'Faturalar',
  '/invoices/new': 'Yeni Fatura',
  '/users': 'Kullanıcı Yönetimi',
  '/users/new': 'Yeni Kullanıcı Ekle',
  '/users/roles': 'Rol Yönetimi',
  '/settings': 'Hesap Ayarları',
  '/settings/profile': 'Profil Ayarları',
  '/settings/business': 'İşletme Ayarları',
  '/settings/users': 'Kullanıcı Yönetimi',
  '/settings/users/new': 'Üye Davet Et',
  '/settings/users/roles': 'Rol Yönetimi',
  '/reports': 'Genel Raporlar',
  '/reports/income-expense': 'Gelir-Gider Raporu',
};

// Helper function to get page title from pathname
function getTitleFromPath(pathname: string): string {
  // Try exact match first
  if (pathTitleMap[pathname]) {
    return pathTitleMap[pathname];
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, title] of Object.entries(pathTitleMap)) {
    if (pattern.includes('[')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\[.*?\]/g, '[^/]+') + '$'
      );
      if (regex.test(pathname)) {
        return title;
      }
    }
  }

  return 'Panel';
}

// Skeleton loader component
function HeaderSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-6 flex-1">
      <div className="h-8 bg-slate-200 rounded-lg w-48"></div>
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user session from local state to avoid token lock contention
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authUser = session?.user;

        if (authUser) {
          setUser(authUser);

          // Fetch user profile from profiles table
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('full_name, company_name, role')
            .eq('id', authUser.id)
            .single();

          if (error) {
            // Sessiz fallback: Profil bulunamadıysa varsayılan değerleri kullan
            // (PGRST116: no rows returned, normal expected behavior for new users)
            setProfile({
              full_name: authUser.user_metadata?.full_name || 'Kullanıcı',
              company_name: 'Şirket',
              role: 'Kullanıcı',
            });
          } else {
            setProfile(profileData || {
              full_name: 'Kullanıcı',
              company_name: 'Şirket',
              role: 'Kullanıcı',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Çıkış yapılırken hata oluştu');
        return;
      }
      toast.success('Başarıyla çıkış yapıldı');
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const pageTitle = getTitleFromPath(pathname);
  const userDisplayName = profile?.full_name?.split(' ')[0] || 'Kullanıcı';
  const userRole = profile?.role || 'Kullanıcı';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center px-8 justify-between sticky top-0 z-40">
      {/* Left side - Page Title */}
      <div className="flex-1">
        {loading ? (
          <HeaderSkeleton />
        ) : (
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {profile?.company_name && `${profile.company_name} • `}
              Hoş geldiniz
            </p>
          </div>
        )}
      </div>

      {/* Center - Search Bar */}
      <div className="flex-shrink-0 mx-8">
        <GlobalSearch />
      </div>

      {/* Right side - Notifications, Settings & User Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications Button */}
        <button
          className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Bildirimler"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings Button */}
        <button
          className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          onClick={() => router.push('/settings/profile')}
          title="Ayarlar"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors active:bg-slate-200"
            title="Profil Menüsü"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 leading-none">
                    {userDisplayName}
                  </p>
                  <p className="text-xs text-slate-500 leading-none">
                    {userRole === 'admin' ? 'ADMIN' : 'Kullanıcı'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </>
            )}
          </button>

          {/* Dropdown Menu */}
          {showDropdown && !loading && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Profile Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <p className="font-semibold text-slate-900">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
              </div>

              {/* Menu Items */}
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    router.push('/settings/profile');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    person
                  </span>
                  <span>Profil Ayarları</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/settings/business');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    business
                  </span>
                  <span>İşletme Ayarları</span>
                </button>

                <hr className="my-1 border-slate-200" />

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    logout
                  </span>
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
