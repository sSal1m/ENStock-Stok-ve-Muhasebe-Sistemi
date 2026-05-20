
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
}

const navLinks: NavLink[] = [
  { id: 'dashboard', href: '/dashboard', label: 'Gösterge Paneli', icon: 'dashboard' },
  { id: 'inventory', href: '/inventory', label: 'Stok', icon: 'inventory_2' },
  { id: 'contacts', href: '/contacts', label: 'Cari (Kişiler)', icon: 'contacts' },
  { id: 'quotes', href: '/quotes', label: 'Teklifler', icon: 'description' },
  { id: 'invoices', href: '/invoices', label: 'Faturalar', icon: 'receipt' },
  { id: 'reports', href: '/reports', label: 'Raporlar', icon: 'analytics' },
  { id: 'trash', href: '/trash', label: 'Çöp Kutusu', icon: 'delete' },
  { id: 'settings', href: '/settings/profile', label: 'Ayarlar', icon: 'settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('id', user.id)
            .single();
          
          if (data) {
            setProfile(data as UserProfile);
          } else {
            setProfile({ company_name: 'Şirketim' });
          }
        }
      } catch (error) {
        console.error('Sidebar profil yükleme hatası:', error);
        setProfile({ company_name: 'Şirketim' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
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
      <div className="p-6 border-b border-surface-container-high">
        <h1 className="text-xl font-bold text-primary">
          {loading ? 'Yükleniyor...' : (profile?.company_name || 'Şirketim')}
        </h1>
        <p className="text-sm text-on-surface/60 mt-1">Muhasebe & Yönetim</p>
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
      <div className="p-4 border-t border-surface-container-high bg-surface">
        <p className="text-xs text-on-surface/50 text-center">
          © 2026 KOBİ Sistemi
        </p>
      </div>
    </aside>
  );
}
