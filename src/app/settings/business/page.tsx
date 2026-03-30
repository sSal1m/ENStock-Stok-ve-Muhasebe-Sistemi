"use client";

import React from "react";
import Image from "next/image";

export default function BusinessSettingsPage() {
  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Left Column: Business Details */}
      <div className="col-span-12 lg:col-span-7 space-y-8">
        {/* Business Information Card */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-tertiary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">İşletme Bilgileri</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="relative group">
              <div className="w-32 h-32 rounded-lg bg-surface-container-low flex items-center justify-center overflow-hidden border-4 border-surface ring-1 ring-outline-variant/20 relative">
                <div className="w-20 h-20 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                  <span className="material-symbols-outlined text-primary text-4xl">corporate_fare</span>
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </div>
              </div>
              <p className="text-[10px] text-center mt-3 uppercase tracking-wider font-bold text-on-surface-variant">Logo Güncelle</p>
            </div>
            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">İşletme Tam Adı</label>
                  <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="text" defaultValue="Sovereign Holdings Ltd." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Vergi Kimlik No</label>
                    <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="text" defaultValue="GB 938 4210 02" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Ticari Sicil No</label>
                    <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="text" defaultValue="REG-77281-XL" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Kayıtlı Adres</label>
                  <textarea className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none min-h-[100px]" defaultValue="88 Canary Wharf, Level 42, London E14 5AA" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-end">
            <button className="px-8 py-3 bg-gradient-to-br from-tertiary to-tertiary-container text-white font-bold rounded-lg shadow-lg shadow-tertiary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm">
              Bilgileri Güncelle
            </button>
          </div>
        </section>

        {/* Financial Settings Card */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-secondary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Finansal Yapılandırma</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Varsayılan Para Birimi</label>
              <select className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none appearance-none">
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="TRY">TRY (₺) - Türk Lirası</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Mali Yıl Başlangıcı</label>
              <input className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none" type="date" defaultValue="2024-01-01" />
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Preview & Stats */}
      <div className="col-span-12 lg:col-span-5 space-y-8">
        {/* Business Profile Preview Card (Sticky) */}
        <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Önizleme</h2>
          </div>
          <div className="space-y-8">
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                  <span className="material-symbols-outlined text-primary text-3xl">corporate_fare</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-on-surface">Sovereign Holdings Ltd.</h3>
                  <span className="px-2 py-0.5 bg-tertiary-container/10 text-tertiary text-[10px] font-bold uppercase rounded tracking-tighter">İşletme Profili</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                Bu bilgiler faturalarınızda, raporlarınızda ve resmi yazışmalarınızda kullanılacaktır.
              </p>
            </div>

            {/* Quick Action Card */}
            <div className="p-6 bg-gradient-to-br from-tertiary to-tertiary-container rounded-xl text-white shadow-xl">
              <h4 className="font-headline font-bold mb-2">Vergi Raporlarını Hazırla</h4>
              <p className="text-tertiary-fixed text-xs mb-6 leading-relaxed">Mevcut işletme ayarlarıyla çeyrek dönem vergi projeksiyonlarını oluşturun.</p>
              <button className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">analytics</span>
                Raporu Başlat
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
