"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function UserListPage() {
  return (
    <>
      {/* Page Header Section */}
      <section className="mb-10 flex items-end justify-between">
        <div>
          <nav className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-label">Yönetim</span>
            <span className="material-symbols-outlined text-[12px] text-slate-300">chevron_right</span>
            <span className="text-[11px] uppercase tracking-wider text-indigo-600 font-bold font-label">Ekip Üyeleri</span>
          </nav>
          <h2 className="text-4xl font-extrabold font-headline text-slate-900 tracking-tight">Kullanıcı Yönetimi</h2>
          <p className="text-slate-500 mt-1 max-w-lg font-body">Tüm finans ekibiniz için organizasyonel erişimi, rolleri ve güvenlik izinlerini yönetin.</p>
        </div>
        <Link 
          href="/users/new"
          className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 hover:opacity-95 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">person_add</span>
          Üye Davet Et
        </Link>
      </section>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold font-label">Toplam Kullanıcı</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">24</span>
            <span className="text-xs text-green-600 font-bold flex items-center gap-1 font-body">+2 <span className="material-symbols-outlined text-[14px]">trending_up</span></span>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold font-label">Aktif</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">18</span>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold font-body">75%</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold font-label">Bekleyen Davetler</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">06</span>
            <span className="text-xs text-slate-400 font-medium font-body">yanıt bekleniyor</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between border-l-4 border-indigo-500">
          <span className="text-[11px] uppercase tracking-wider text-indigo-600 font-bold font-label">Yönetici Kotası</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">3/5</span>
            <span className="text-xs text-slate-400 font-medium font-body">Premium Plan</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-body">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label">İsim</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label">E-posta</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label">Rol</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label">Durum</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* Row 1: Admin */}
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-10 h-10">
                      <div className="w-full h-full rounded-xl overflow-hidden relative ring-2 ring-slate-100">
                        <Image
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCm362Pd5qQ0hSYLbnMyxRWe77Yn8uXoiMdSg3N7iDU3fm97CMgl6PC22ualuu4tlbup0X5K5ISf0G8cGn3J5rG-vLNAdzBRFL04uHiv-_aKOkbpk34rQp_JdDvA2bu4vuM24i-4pmUx8HchLSE-LFJ70p4CqMTO6IdOoxJaThz-cbjxP7w8zexeD03TcZSeTEQBlxywBupDV2g-D3H6UV-6gBLPmE5vgjEXlq30SnGmeHeMvMJPnsn6aYU1kKy1Sox13r9gjsxCRk"
                          alt="Selin Yılmaz"
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Selin Yılmaz</p>
                      <p className="text-xs text-slate-400">Ekim 2023'te katıldı</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-sm font-medium text-slate-600">selin.yilmaz@ledger.io</span>
                </td>
                <td className="px-8 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Yönetici
                  </span>
                </td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Aktif
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-error hover:bg-error-container/30 rounded-lg transition-all">
                      <span className="material-symbols-outlined text-lg">person_remove</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 2: Edit Mode */}
              <tr className="bg-indigo-50/30 ring-1 ring-inset ring-indigo-100 relative">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 ring-2 ring-white">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Murat Kaya</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">Düzenleniyor</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <input
                    className="text-sm font-medium bg-white border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full py-2 px-3 outline-none"
                    type="email"
                    defaultValue="m.kaya@finans.co"
                  />
                </td>
                <td className="px-8 py-5">
                  <div className="relative inline-block w-full">
                    <select className="appearance-none w-full bg-white border-slate-200 rounded-lg py-2 pl-3 pr-10 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                      <option>Yönetici</option>
                      <option defaultValue="accounting">Muhasebe</option>
                      <option>Personel</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">unfold_more</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Aktif
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">İptal</button>
                    <button className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all">Değişiklikleri Kaydet</button>
                  </div>
                </td>
              </tr>

              {/* Row 3: Staff */}
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 relative">
                      <div className="w-full h-full rounded-xl overflow-hidden relative ring-2 ring-slate-100">
                        <Image
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCq08FZDtJAJbxoCXzxSJDERTQPiK_78xSDu5SKvIqxCk1AlOlOrgaxyy69ggSUqHr-LrI8XncM8i0O3WC1KMv-tvPwbQOglzzE4h7msPAPZzwa2hdP8n9BmuHglMv4v541tS3jN10f9odE4VGfg1vA7QbEucPSwQkVN0R2Q78m5NRBYi65W42OSMi0a5u9ZobNGIPNLDZmcDv2u9uo8lxnY4F34OU7soR986WDy9i8QY3UvN6hGPEjNhCy429Ta5MYBpah0mnNvmo"
                          alt="Caner Aras"
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Caner Aras</p>
                      <p className="text-xs text-slate-400">Ocak 2024'te katıldı</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-sm font-medium text-slate-600">c.aras@ledger.io</span>
                </td>
                <td className="px-8 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    Personel
                  </span>
                </td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Aktif
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-error hover:bg-error-container/30 rounded-lg transition-all">
                      <span className="material-symbols-outlined text-lg">person_off</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Table Footer / Pagination */}
        <div className="px-8 py-6 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium font-body"><span className="text-slate-900 font-bold">24</span> üyeden <span className="text-slate-900 font-bold">1-10</span> arası gösteriliyor</p>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-white transition-colors">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-white transition-colors">3</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-white">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Permissions Context Card */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface-container-low p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl">verified_user</span>
          </div>
          <h4 className="font-headline font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Yönetici Kontrolleri
          </h4>
          <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-body">Finansal kayıtlara, kullanıcı yönetimine, faturalandırmaya ve sistem ayarlarına tam erişim.</p>
          <Link href="/users/roles" className="text-xs font-bold text-indigo-600 flex items-center gap-1 group font-body">
            Politikayı Görüntüle <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl">analytics</span>
          </div>
          <h4 className="font-headline font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Muhasebeci Görünümü
          </h4>
          <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-body">Üye yönetimi olmadan defterlere, vergi raporlarına ve denetim günlüklerine özel erişim.</p>
          <Link href="/users/roles" className="text-xs font-bold text-emerald-600 flex items-center gap-1 group font-body">
            Erişimi Yapılandır <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl">lock</span>
          </div>
          <h4 className="font-headline font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Güvenlik Aktivitesi
          </h4>
          <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-body">Giriş geçmişini, IP adresi değişikliklerini ve kritik izin modifikasyonlarını inceleyin.</p>
          <button className="text-xs font-bold text-slate-600 flex items-center gap-1 group font-body">
            Denetim Günlükleri <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </>
  );
}
