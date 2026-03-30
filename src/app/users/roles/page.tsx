"use client";

import React from "react";
import Image from "next/image";

export default function RolesPermissionsPage() {
  return (
    <>
      <style jsx>{`
        .switch-input:checked + .switch-dot {
          transform: translateX(1.25rem);
          background-color: white;
        }
        .switch-input:checked ~ .switch-bg {
          background-color: #4b41e1;
        }
      `}</style>

      {/* Header Section with Bento Elements */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low p-8 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-headline text-3xl font-extrabold text-on-surface mb-2 tracking-tight">Erişim Kontrolü</h3>
            <p className="text-on-surface-variant max-w-md font-body">Kullanıcı rollerini ve bu rollere bağlı modül bazlı yetkileri buradan yönetebilirsiniz. Güvenlik için yetkileri periyodik olarak kontrol edin.</p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[160px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 bg-primary rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl shadow-indigo-100">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <span className="text-xs font-bold tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full font-label">Güvenli</span>
          </div>
          <div>
            <div className="text-4xl font-headline font-black mb-1">3 Aktif</div>
            <div className="text-sm opacity-80 font-medium uppercase tracking-wider font-label tracking-widest">Kullanıcı Rolü Tanımlı</div>
          </div>
        </div>
      </div>

      {/* Role Permissions Table */}
      <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-sm">
        {/* Table Header Controls */}
        <div className="p-6 bg-surface-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            <h4 className="font-headline font-bold text-lg px-2 text-on-surface">Yetki Matrisi</h4>
          </div>
          <div className="flex items-center bg-surface-container-lowest p-1 rounded-xl shadow-sm">
            <button className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-md transition-all font-body">Admin</button>
            <button className="px-6 py-2 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-all rounded-lg font-body">Muhasebe</button>
            <button className="px-6 py-2 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-all rounded-lg font-body">Depo Personeli</button>
          </div>
        </div>

        {/* Permission Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-4 px-6 font-body">
            <thead>
              <tr className="text-on-surface-variant">
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70">Modül Adı</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Görüntüle</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Ekle</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Düzenle</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Sil</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-right">Durum</th>
              </tr>
            </thead>
            <tbody>
              {/* Row: Stok Yönetimi */}
              <Row icon="inventory_2" title="Stok Yönetimi" description="Ürün ve Depo Hareketleri" color="blue" />
              {/* Row: Cari Hesaplar */}
              <Row icon="groups" title="Cari Hesaplar" description="Müşteri ve Tedarikçi Portföyü" color="indigo" />
              {/* Row: Faturalar */}
              <Row icon="receipt_long" title="Faturalar" description="Alış, Satış ve Gider Faturası" color="purple" />
              {/* Row: Raporlar */}
              <Row icon="analytics" title="Raporlar" description="Finansal Analiz ve Grafik" color="emerald" />
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-8 border-t border-outline-variant/10 flex justify-end space-x-4 bg-surface-container-low/50">
          <button className="px-8 py-3 rounded-xl text-sm font-semibold text-on-surface hover:bg-white transition-all font-body">Sıfırla</button>
          <button className="px-10 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-indigo-200 active:scale-95 transition-all font-body">Değişiklikleri Kaydet</button>
        </div>
      </div>

      {/* Role Summary Cards (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <SummaryCard icon="person" label="Admin Kullanıcı" count={12} />
        <SummaryCard icon="payments" label="Muhasebe Personeli" count={4} />
        <SummaryCard icon="warehouse" label="Depo Personeli" count={28} />
      </div>
    </>
  );
}

function Row({ icon, title, description, color }: { icon: string, title: string, description: string, color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <tr className="group hover:translate-x-1 transition-transform duration-200">
      <td className="bg-surface-container-lowest py-6 px-6 rounded-l-2xl shadow-sm">
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
          <div>
            <div className="font-headline font-bold text-on-surface">{title}</div>
            <div className="text-[11px] text-on-surface-variant font-medium font-label tracking-wide">{description}</div>
          </div>
        </div>
      </td>
      <td className="bg-surface-container-lowest py-6 px-6 shadow-sm text-center">
        <Switch checked />
      </td>
      <td className="bg-surface-container-lowest py-6 px-6 shadow-sm text-center">
        <Switch checked />
      </td>
      <td className="bg-surface-container-lowest py-6 px-6 shadow-sm text-center">
        <Switch checked />
      </td>
      <td className="bg-surface-container-lowest py-6 px-6 shadow-sm text-center">
        <Switch checked />
      </td>
      <td className="bg-surface-container-lowest py-6 px-6 rounded-r-2xl shadow-sm text-right">
        <span className="bg-tertiary-container/10 text-on-tertiary-fixed-variant text-[10px] font-bold px-3 py-1.5 rounded-full border border-tertiary-container/20 font-label tracking-widest">TAM ERİŞİM</span>
      </td>
    </tr>
  );
}

function Switch({ checked }: { checked?: boolean }) {
  return (
    <label className="inline-flex items-center cursor-pointer relative">
      <input defaultChecked={checked} className="sr-only switch-input" type="checkbox" />
      <div className="switch-bg block bg-slate-200 w-10 h-5 rounded-full transition-colors"></div>
      <div className="switch-dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm"></div>
    </label>
  );
}

function SummaryCard({ icon, label, count }: { icon: string, label: string, count: number }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 flex items-center space-x-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-label">{label}</div>
        <div className="text-xl font-headline font-extrabold text-slate-900">{count}</div>
      </div>
    </div>
  );
}
