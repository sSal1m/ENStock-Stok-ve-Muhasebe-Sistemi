'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Gösterge Paneli', icon: 'dashboard' },
  { href: '/inventory', label: 'Stok', icon: 'inventory_2' },
  { href: '/contacts', label: 'Cari (Kişiler)', icon: 'contacts' },
  { href: '/invoices', label: 'Faturalar', icon: 'receipt' },
  { href: '/reports', label: 'Raporlar', icon: 'analytics' },
  { href: '/settings', label: 'Ayarlar', icon: 'settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-64 bg-surface border-r border-surface-container-high h-screen overflow-y-auto sticky top-0 shadow-sm flex flex-col">
      {/* Logo/Brand Section */}
      <div className="p-6 border-b border-surface-container-high">
        <h1 className="text-xl font-bold text-primary">KOBİ Hesap</h1>
        <p className="text-sm text-on-surface/60 mt-1">Muhasebe & Yönetim</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {navLinks.map((link) => (
          <Link
            key={link.href}
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
        ))}
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
