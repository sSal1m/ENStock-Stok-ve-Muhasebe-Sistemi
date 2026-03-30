"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isProfileActive = pathname === "/settings/profile";
  const isBusinessActive = pathname === "/settings/business";

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full z-40 flex flex-col py-6 px-4 bg-slate-50 dark:bg-slate-900 w-64 border-r-0 font-headline font-semibold tracking-tight">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Sovereign Ledger</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Yönetim Paneli</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors scale-98 active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">dashboard</span>
            Gösterge Paneli
          </Link>
          <Link
            href="/inventory"
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors scale-98 active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">inventory_2</span>
            Envanter
          </Link>
          <Link
            href="/ledger"
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors scale-98 active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">menu_book</span>
            Defter
          </Link>
          <Link
            href="/invoices"
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors scale-98 active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">description</span>
            Faturalar
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors scale-98 active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">analytics</span>
            Raporlar
          </Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-slate-800 space-y-1">
          <Link
            href="/settings/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-sm font-headline font-semibold tracking-tight transition-all ${
              pathname.startsWith("/settings")
                ? "bg-white dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            Ayarlar
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined">help_outline</span>
            Destek
          </Link>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="flex justify-between items-center w-full h-16 px-8 ml-64 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 border-b border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none z-30">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-lg">search</span>
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
              placeholder="Parametre ara..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6 font-body text-sm font-medium">
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-all">Profil</Link>
            <Link href="/notifications" className="text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-all">Bildirimler</Link>
            <Link href="/help" className="text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-all">Yardım</Link>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white dark:border-slate-950"></span>
            </button>
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-200 relative">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4Eq3TRUzJc9sytl2a2_ii5gnTRwsLEwMUteOOZby6HxCBxs1H7I-Vl2mW8iDpN37xTD5gpfqpC2OLVPfviE25xr9CPBnnzUh2uSjDJDAaZsEJFGgev9kq3oq7l2bNtj8jsu1id7zr5Z2Xug0pZE9cPZdLLBn10EF4Jsn08LTSDhsRUKNLJq6uWfjn71JMZg0xBCGyjcyHKUY_kdIv-Q2_nMt88s_tCnTZ4NLbaijB8gBqHjYnK8ma3jKEikTk4VsFQpHgnHvXE9M"
                  alt="User"
                  fill
                  style={{ objectFit: "cover" }}
                />
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-600">expand_more</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ml-64 p-10 max-w-6xl">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-on-background mb-2">Ayarlar</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Kişisel tercihlerinizi, güvenlik protokollerinizi ve ticari işletme ayrıntılarınızı bu merkezi mimari merkezden yönetin.
          </p>
        </div>

        {/* Tabbed Interface */}
        <div className="flex gap-8 mb-8 border-b border-outline-variant/20">
          <Link
            href="/settings/profile"
            className={`pb-4 text-sm font-bold tracking-tight transition-colors ${
              isProfileActive
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Kullanıcı Profili
          </Link>
          <Link
            href="/settings/business"
            className={`pb-4 text-sm font-bold tracking-tight transition-colors ${
              isBusinessActive
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            İşletme Ayarları
          </Link>
        </div>

        {children}
      </main>
    </div>
  );
}
