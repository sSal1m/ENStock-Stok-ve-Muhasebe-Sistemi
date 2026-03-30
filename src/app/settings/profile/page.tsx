"use client";

import React from "react";
import Image from "next/image";

export default function ProfilePage() {
  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Left Column: User Profile */}
      <div className="col-span-12 lg:col-span-7 space-y-8">
        {/* Profile Information Card */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Profil Bilgileri</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border-4 border-surface ring-1 ring-outline-variant/20 relative">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY5E2U5beAf0HPxnaZY_3SyyRPUzvnCyIBK8R7co4UYzbP8LSzDQTFYaWAjCrWObJ8b8an_PNCxkbdT39Lj-JVfjvS2Fj7hG2tLorvbgm8FWpmecUaQcfKyPK5RmWc4WQm22snPKPqESke94N3ANzD_ghrflBmp4Uu8JyNsOumn9J2tQOUOJ2K0ByOZChQ2-WhrXGeWwyNHxoNccGXrcTJE4Wab5TSUy3z3WoK2c_up-8q-jkCY5Xuf5Yw1dFITHkM_Zc-pJ04TlI"
                  alt="Avatar"
                  fill
                  style={{ objectFit: "cover" }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </div>
              </div>
              <p className="text-[10px] text-center mt-3 uppercase tracking-wider font-bold text-on-surface-variant">Fotoğrafı Güncelle</p>
            </div>
            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Ad Soyad</label>
                  <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="text" defaultValue="Alexander Sovereign" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">E-posta Adresi</label>
                  <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="email" defaultValue="alexander@sovereign-ledger.com" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-end">
            <button className="px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm">
              Profili Kaydet
            </button>
          </div>
        </section>

        {/* Change Password Card */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Güvenlik ve Erişim</h2>
          </div>
          <div className="space-y-6 max-w-md">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Mevcut Şifre</label>
              <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" placeholder="••••••••••••" type="password" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Yeni Şifre</label>
                <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="password" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Yeni Şifreyi Onayla</label>
                <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="password" />
              </div>
            </div>
            <div className="pt-4">
              <button className="px-6 py-2.5 bg-secondary text-white font-bold rounded-lg hover:bg-on-secondary-container transition-colors text-xs uppercase tracking-widest">
                Güvenliği Güncelle
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Business Summary */}
      <div className="col-span-12 lg:col-span-5 space-y-8">
        {/* Business Profile Preview Card */}
        <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-tertiary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">İşletme Özeti</h2>
          </div>
          <div className="space-y-8">
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                  <span className="material-symbols-outlined text-primary text-3xl">corporate_fare</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-on-surface">Sovereign Holdings Ltd.</h3>
                  <span className="px-2 py-0.5 bg-tertiary-container/10 text-tertiary text-[10px] font-bold uppercase rounded tracking-tighter">Doğrulanmış İşletme</span>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-outline-variant/10">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Vergi Kimlik No</span>
                  <span className="text-sm font-medium text-on-surface">GB 938 4210 02</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Kayıtlı Adres</span>
                  <span className="text-sm font-medium text-right max-w-[180px] text-on-surface">88 Canary Wharf, Level 42, London E14 5AA</span>
                </div>
              </div>
            </div>
            {/* Quick Action Card */}
            <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white shadow-xl">
              <h4 className="font-headline font-bold mb-2">Defter Yapılandırmasını Dışa Aktar</h4>
              <p className="text-indigo-200 text-xs mb-6 leading-relaxed">Yedekleme veya ikincil paketlere taşıma için mevcut mimari ayarlarınızı indirin.</p>
              <button className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span>
                XML Şemasını İndir
              </button>
            </div>
          </div>
        </section>

        {/* System Preferences */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1 h-6 bg-on-surface-variant rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Arayüz Kuralları</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">dark_mode</span>
                <span className="text-sm font-medium text-on-surface">Gece Modu</span>
              </div>
              <div className="w-10 h-5 bg-outline-variant rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">notifications_active</span>
                <span className="text-sm font-medium text-on-surface">Canlı Senkronizasyon</span>
              </div>
              <div className="w-10 h-5 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
