
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePermissions } from '@/hooks/usePermissions';

interface NavLink {
  id: string;
  href: string;
  label: string;
  icon: string;
}

interface UserProfile {
  company_name: string;
  logo_url?: string | null;
}

const navLinks: NavLink[] = [
  { id: 'dashboard', href: '/dashboard', label: 'Gösterge Paneli', icon: 'dashboard' },
  { id: 'inventory', href: '/inventory', label: 'Stok', icon: 'inventory_2' },
  { id: 'contacts', href: '/contacts', label: 'Cari (Kişiler)', icon: 'contacts' },
  { id: 'quotes', href: '/quotes', label: 'Teklifler', icon: 'description' },
  { id: 'invoices', href: '/invoices', label: 'Faturalar', icon: 'receipt' },
  { id: 'reports', href: '/reports', label: 'Raporlar', icon: 'analytics' },
  { id: 'activity-log', href: '/activity-log', label: 'İşlem Geçmişi', icon: 'history' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any = null;

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('company_name, logo_url')
            .eq('id', user.id)
            .single();
          
          if (data) {
            setProfile(data as UserProfile);
          } else {
            setProfile({ company_name: 'Şirketim', logo_url: null });
          }

          // Realtime listener for company name & logo updates
          channel = supabase
            .channel('sidebar-profile-changes')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`,
              },
              (payload) => {
                setProfile(prev => prev ? {
                  ...prev,
                  company_name: payload.new.company_name || prev.company_name,
                  logo_url: payload.new.logo_url !== undefined ? payload.new.logo_url : prev.logo_url
                } : null);
              }
            )
            .subscribe();
        }
      } catch (error) {
        console.error('Sidebar profil yükleme hatası:', error);
        setProfile({ company_name: 'Şirketim', logo_url: null });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const getModuleId = (href: string) => {
    if (href.includes('inventory')) return 'stock';
    if (href.includes('contacts')) return 'contacts';
    if (href.includes('quotes')) return 'quotes';
    if (href.includes('invoices')) return 'invoices';
    if (href.includes('reports')) return 'reports';
    return null;
  };

  return (
    <aside className="w-64 bg-surface border-r border-surface-container-high h-screen overflow-y-auto sticky top-0 shadow-sm flex flex-col">
      {/* Logo/Brand Section */}
      <div className="p-5 border-b border-surface-container-high flex items-center gap-4">
        {profile?.logo_url ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-surface-container-high flex-shrink-0 relative shadow-sm hover:scale-[1.03] transition-transform duration-200 bg-white dark:bg-slate-900 flex items-center justify-center">
            <img
              src={profile.logo_url}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary border border-primary/20 shadow-sm hover:scale-[1.03] transition-transform duration-200">
            <span className="material-symbols-outlined text-3xl">corporate_fare</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-extrabold text-primary truncate leading-snug">
            {loading ? 'Yükleniyor...' : (profile?.company_name || 'Şirketim')}
          </h1>
          <p className="text-[11px] font-medium text-on-surface/50 mt-0.5 uppercase tracking-wider">Muhasebe & Yönetim</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {navLinks.map((link) => {
          const moduleId = getModuleId(link.href);
          
          // Only filter if not admin (admin sees all) and permissions are loaded
          if (!permsLoading && moduleId && !hasPermission(moduleId, 'view')) {
            return null;
          }

          return (
            <Link
              key={link.id}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive(link.href)
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{link.icon}</span>
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-surface-container-high bg-transparent flex justify-center items-center">
        <img src="/logo_wide.png" alt="ENStock Logo" className="h-16 object-contain opacity-50 hover:opacity-100 transition-opacity duration-200 dark:invert" />
      </div>
    </aside>
  );
}
