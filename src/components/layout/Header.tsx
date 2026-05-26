'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import GlobalSearch from './GlobalSearch';

interface UserProfile {
  full_name: string;
  company_name: string;
  role?: string;
  avatar_url?: string | null;
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
  '/trash': 'Çöp Kutusu',
  '/quotes': 'Teklifler',
  '/quotes/new': 'Yeni Teklif',
  '/quotes/[id]': 'Teklif Detayı',
  '/quotes/[id]/edit': 'Teklifi Düzenle',
};

// Path to page description mapping (dynamic subtitles)
const pathDescriptionMap: Record<string, string> = {
  '/inventory': 'Depo stoklarınızı, kritik seviyeleri ve ürün hareketlerini kontrol altında tutun.',
  '/dashboard': 'İşletmenizin genel finansal özetini ve anlık durumunu buradan takip edin.',
  '/contacts': 'Müşteri ve tedarikçi (cari) hesaplarınızı, bakiye ve risk durumlarını yönetin.',
  '/invoices': 'Alış ve satış faturalarınızı oluşturun, ödeme durumlarını takip edin.',
  '/reports': 'İşletmenizin finansal ve stok analizlerini detaylı raporlarla inceleyin.',
  '/trash': 'Silinen kayıtlarınızı buradan görüntüleyebilir veya kalıcı olarak silebilirsiniz.',
  '/quotes': 'Müşterilerinize sunduğunuz teklifleri buradan yönetin ve kolayca faturaya dönüştürün.',
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

// Helper function to get page description from pathname
function getDescriptionFromPath(pathname: string): string {
  // Try exact match first
  if (pathDescriptionMap[pathname]) {
    return pathDescriptionMap[pathname];
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, desc] of Object.entries(pathDescriptionMap)) {
    if (pattern.includes('[')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\[.*?\]/g, '[^/]+') + '$'
      );
      if (regex.test(pathname)) {
        return desc;
      }
    }
  }

  // Default description
  return '';
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
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      saveThemePreference(true);
    } else {
      document.documentElement.classList.remove('dark');
      saveThemePreference(false);
    }
  };

  const saveThemePreference = (isDark: boolean) => {
    try {
      const prefs = localStorage.getItem('user_preferences');
      let parsed = prefs ? JSON.parse(prefs) : {};
      parsed.darkMode = isDark;
      localStorage.setItem('user_preferences', JSON.stringify(parsed));
    } catch (e) {
      console.error("Failed to save preferences", e);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
        setShowNotificationsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            .select('full_name, company_name, role, avatar_url')
            .eq('id', authUser.id)
            .single();

          if (error) {
            // Sessiz fallback: Profil bulunamadıysa varsayılan değerleri kullan
            setProfile({
              full_name: authUser.user_metadata?.full_name || 'Kullanıcı',
              company_name: 'Şirket',
              role: 'Kullanıcı',
              avatar_url: authUser.user_metadata?.avatar_url || null,
            });
          } else {
            setProfile(profileData ? {
              full_name: profileData.full_name || 'Kullanıcı',
              company_name: profileData.company_name || 'Şirket',
              role: profileData.role || 'Kullanıcı',
              avatar_url: profileData.avatar_url || authUser.user_metadata?.avatar_url || null,
            } : {
              full_name: 'Kullanıcı',
              company_name: 'Şirket',
              role: 'Kullanıcı',
              avatar_url: authUser.user_metadata?.avatar_url || null,
            });
          }

          // Fetch overdue invoices
          const { fetchTeamScopedData } = await import('@/app/(dashboard)/teamActions');
          const { data: invoicesData } = await fetchTeamScopedData(
            authUser.id,
            "invoices",
            "id, invoice_number, due_date, is_paid, status, contact_id, contacts(name)",
            {
              excludeDeleted: true,
            }
          );

          if (invoicesData) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const filteredOverdue = invoicesData.filter((inv: any) => {
              if (inv.status === 'draft' || inv.status === 'paid' || inv.is_paid === true) return false;
              if (!inv.due_date) return false;
              const dueDate = new Date(inv.due_date);
              dueDate.setHours(0, 0, 0, 0);
              return dueDate < today;
            });

            setOverdueInvoices(filteredOverdue);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Dinamik profil/avatar güncellemelerini yakalamak için auth state dinleyici
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            avatar_url: session.user.user_metadata?.avatar_url || prev.avatar_url,
            full_name: session.user.user_metadata?.full_name || prev.full_name,
          };
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
  const pageDescription = getDescriptionFromPath(pathname);
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
            <p className="text-sm text-gray-500 mt-1">
              {pageDescription || (profile?.company_name && `${profile.company_name} • Hoş geldiniz`)}
            </p>
          </div>
        )}
      </div>

      {/* Center - Search Bar */}
      <div className="flex-shrink-0 mx-8">
        <GlobalSearch />
      </div>

      {/* Right side - Trash, Notifications, Settings & User Menu */}
      <div className="flex items-center gap-2">
        {/* Tema Seçim Butonu */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 shadow-sm cursor-pointer mr-1"
          title="Temayı Değiştir"
          aria-label="Temayı Değiştir"
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? "dark_mode" : "light_mode"}
          </span>
        </button>

        {/* Çöp Kutusu (Trash) Button */}
        <button
          className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative flex items-center justify-center"
          onClick={() => router.push('/trash')}
          title="Çöp Kutusu"
        >
          <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:scale-110">
            delete
          </span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-semibold whitespace-nowrap shadow-sm">
            Çöp Kutusu
          </span>
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative" ref={notificationsMenuRef}>
          <button
            className={`p-2.5 rounded-lg transition-colors flex items-center justify-center group relative ${
              showNotificationsDropdown 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
            onClick={() => {
              setShowNotificationsDropdown(!showNotificationsDropdown);
              setShowSettingsDropdown(false);
              setShowDropdown(false);
            }}
            title="Bildirimler"
          >
            <span className="material-symbols-outlined text-xl transition-transform duration-200 group-hover:scale-110">
              notifications
            </span>
            {overdueInvoices.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center animate-pulse border border-white">
                {overdueInvoices.length}
              </span>
            )}
          </button>

          {showNotificationsDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Notifications Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-red-500">warning</span>
                    Vadesi Geçen Faturalar
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Vadesi geçmiş alacak ve borç takibi</p>
                </div>
                {overdueInvoices.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {overdueInvoices.length} Yeni
                  </span>
                )}
              </div>

              {/* Notifications Items */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {overdueInvoices.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                    <p className="text-xs font-semibold">Vadesi geçmiş fatura bulunmamaktadır.</p>
                  </div>
                ) : (
                  overdueInvoices.map((inv) => (
                    <div 
                      key={inv.id} 
                      className="p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer flex gap-3 items-start"
                      onClick={() => {
                        router.push(`/invoices/new?id=${inv.id}`);
                        setShowNotificationsDropdown(false);
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 text-red-500">
                        <span className="material-symbols-outlined text-base">report</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {inv.invoice_number}
                          </p>
                          <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide">
                            Vadesi Geçti
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                          {inv.contacts?.name || "Bilinmeyen Cari"}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium mt-1">
                          Vade Tarihi: {new Date(inv.due_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Notifications Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center font-bold">
                <button
                  onClick={() => {
                    router.push('/invoices');
                    setShowNotificationsDropdown(false);
                  }}
                  className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                >
                  Tüm Faturaları Görüntüle
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Dropdown Button */}
        <div className="relative" ref={settingsMenuRef}>
          <button
            className={`p-2.5 rounded-lg transition-colors flex items-center justify-center group relative ${
              showSettingsDropdown 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
            onClick={() => {
              setShowSettingsDropdown(!showSettingsDropdown);
              setShowDropdown(false);
            }}
            title="Ayarlar"
          >
            <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${
              showSettingsDropdown ? 'rotate-90 text-indigo-600' : 'group-hover:rotate-45'
            }`}>
              settings
            </span>
          </button>

          {showSettingsDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Settings Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-indigo-600">tune</span>
                  Sistem Ayarları
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Sistem ve kullanıcı tercihlerini yönetin</p>
              </div>

              {/* Settings Items */}
              <div className="p-2 space-y-0.5">
                <button
                  onClick={() => {
                    router.push('/settings/profile');
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-lg transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-base">manage_accounts</span>
                  <span>Profil Ayarları</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/settings/business');
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-lg transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-base">store</span>
                  <span>İşletme Ayarları</span>
                </button>

                {userRole === 'admin' && (
                  <>
                    <hr className="my-1 border-slate-100" />
                    
                    <button
                      onClick={() => {
                        router.push('/settings/users');
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-lg transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base">group</span>
                      <span>Kullanıcı Yönetimi</span>
                    </button>

                    <button
                      onClick={() => {
                        router.push('/settings/users/roles');
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-lg transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                      <span>Rol Yönetimi</span>
                    </button>

                    <button
                      onClick={() => {
                        router.push('/settings/users/new');
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-lg transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base text-indigo-600">person_add</span>
                      <span>Üye Davet Et</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowSettingsDropdown(false);
            }}
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
                 {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profil Resmi"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
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

