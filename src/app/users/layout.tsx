"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-screen w-64 z-40 flex flex-col bg-slate-50 border-r-0 font-headline font-semibold tracking-tight tonal-shift">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-headline">Sovereign Ledger</h1>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-label">KOBİ Muhasebe</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 mt-4 px-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 transition-colors duration-200 rounded-lg"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm font-body">Panel</span>
          </Link>
          <Link
            href="/inventory"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 transition-colors duration-200 rounded-lg"
          >
            <span className="material-symbols-outlined">inventory_2</span>
            <span className="text-sm font-body">Stok Yönetimi</span>
          </Link>
          <Link
            href="/ledger"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 transition-colors duration-200 rounded-lg"
          >
            <span className="material-symbols-outlined">menu_book</span>
            <span className="text-sm font-body">Defter-i Kebir</span>
          </Link>
          <Link
            href="/invoices"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 transition-colors duration-200 rounded-lg"
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="text-sm font-body">Faturalar</span>
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 transition-colors duration-200 rounded-lg"
          >
            <span className="material-symbols-outlined">assessment</span>
            <span className="text-sm font-body">Raporlar</span>
          </Link>
          <Link
            href="/users"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 transition-all ${
              pathname.startsWith("/users")
                ? "text-indigo-700 font-bold bg-indigo-50/50 border-indigo-600 shadow-sm"
                : "text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 border-transparent shadow-none"
            }`}
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="text-sm font-body">Kullanıcı Yönetimi</span>
          </Link>
        </nav>
        <div className="p-6 mt-auto">
          <Link 
            href="/users/new"
            className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="text-sm font-body">Yeni Davet</span>
          </Link>
        </div>
        <div className="px-3 pb-6 space-y-1">
          <Link
            href="/settings/profile"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 transition-colors duration-200 rounded-lg"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-body">Ayarlar</span>
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-3 px-4 py-3 text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/50 transition-colors duration-200 rounded-lg"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm font-body">Destek</span>
          </Link>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 px-8 flex items-center justify-between z-30 bg-white/80 backdrop-blur-md border-b border-slate-100/50 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400 font-body"
              placeholder="Ekip üyelerini ara..."
              type="text"
            />
          </div>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <span className="font-headline font-bold text-lg text-indigo-600 tracking-tight">Kullanıcı Yönetimi</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
          </div>
          <div className="flex items-center gap-3 ml-4 cursor-pointer group">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 font-body">Mert Soylu</p>
              <p className="text-[10px] text-slate-500 font-label uppercase tracking-widest leading-none">Yönetici</p>
            </div>
            <div className="w-9 h-9 rounded-full ring-2 ring-indigo-50 ring-offset-2 transition-all group-hover:ring-indigo-200 overflow-hidden relative border border-slate-200">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNh5Rl-JboQ36NaTkr7L0r2lUQSxpcx0pPw-JoCxRtX-KShyxUsYMBuPhvys-IeKkIhZDULFfOvkrIcLnvgVAvLyTenR6zgzXNpUGfVwNw4zFVwVldHgdN2A3_-Oe7PcQz47jExTYT_JFn-B7OPuONAG3jITXyHXzcSrxwsWFeV6_XW_EQmTdOs-wtXCVo2L8h9J17wlbzKGK4A13gHTZ3YA-ZoKU2u6oZN05tkKWyCchBVohW5lEMZ2ZYk6yNI-Zhv9rgBmdjLXE"
                alt="Profile"
                fill
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-24 pl-72 pr-8 pb-12 min-h-screen bg-surface">
        {children}
      </main>
      
      <style jsx global>{`
        .tonal-shift { background-color: #f2f3ff; }
      `}</style>
    </div>
  );
}
