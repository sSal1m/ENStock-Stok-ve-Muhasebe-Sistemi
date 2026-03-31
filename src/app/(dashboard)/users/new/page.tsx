"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function InviteUserPage() {
  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-outline mb-8 uppercase tracking-widest font-label">
        <Link href="/users" className="hover:text-primary transition-colors">EKİP YÖNETİMİ</Link>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <span className="text-on-surface">YENİ ÜYE DAVETİ</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Form Section */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Ekibe Katılmaya Davet Et</h2>
            <p className="text-on-surface-variant leading-relaxed font-body">Yeni çalışma arkadaşınızın bilgilerini girin ve Sovereign Ledger ekosistemine dahil olması için bir davet gönderin.</p>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
            <form className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-outline font-label" htmlFor="full_name">Ad Soyad</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">person</span>
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface transition-all font-body outline-none"
                    id="full_name"
                    placeholder="Örn: Mehmet Öz"
                    type="text"
                  />
                </div>
              </div>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-outline font-label" htmlFor="email">E-posta Adresi</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">mail</span>
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface transition-all font-body outline-none"
                    id="email"
                    placeholder="mehmet.oz@sirket.com"
                    type="email"
                  />
                </div>
              </div>
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-outline font-label" htmlFor="role">Rol Seçimi</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">shield_person</span>
                  <select
                    className="w-full pl-12 pr-10 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface appearance-none transition-all font-body outline-none"
                    id="role"
                  >
                    <option value="accounting">Muhasebe</option>
                    <option value="admin">Yönetici</option>
                    <option value="warehouse">Depo Personeli</option>
                    <option value="sales">Satış Temsilcisi</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline pointer-events-none">expand_more</span>
                </div>
              </div>
              {/* Submit Button */}
              <div className="pt-4">
                <button className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 px-6 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-body" type="submit">
                  <span className="material-symbols-outlined">send</span>
                  Davet Gönder
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Authority Summary (Side Info Section) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold font-headline text-on-surface">Yetki Özeti</h3>
            </div>
            {/* Current Selected Role Info */}
            <div className="space-y-6">
              <div className="p-4 bg-surface-container-lowest rounded-lg border border-primary/5">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span className="text-sm font-bold uppercase tracking-tight font-label">Muhasebe Rolü</span>
                </div>
                <p className="text-sm text-on-surface-variant mb-4 font-body leading-relaxed">Bu rol, finansal verilerin yönetimi ve raporlama süreçleri için optimize edilmiştir.</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                    <div className="text-sm font-body">
                      <span className="font-bold text-on-surface">Erişim:</span>{" "}
                      <span className="text-on-surface-variant">Faturalar, Raporlar, Cari Hesaplar</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                    <div className="text-sm font-body">
                      <span className="font-bold text-on-surface">Yetki:</span>{" "}
                      <span className="text-on-surface-variant">Gider Onayı, Banka Entegrasyonu</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-error text-lg">cancel</span>
                    <div className="text-sm font-body">
                      <span className="font-bold text-on-surface">Kısıtlama:</span>{" "}
                      <span className="text-on-surface-variant">Sistem Ayarları, Kullanıcı Yönetimi</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Pro Tip */}
              <div className="flex gap-4 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100/30">
                <span className="material-symbols-outlined text-indigo-600">lightbulb</span>
                <div>
                  <div className="text-xs font-bold text-indigo-700 uppercase mb-1 font-label">Küçük Bir İpucu</div>
                  <p className="text-[13px] text-indigo-900/70 leading-relaxed font-body">Ekip üyeleri daveti kabul ettikten sonra rollerini istediğiniz zaman Ayarlar panelinden değiştirebilirsiniz.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Card */}
          <div className="relative rounded-xl overflow-hidden h-48 shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBa4v3w2FsD_SI190i-MCazBdS9-sFnJZVfejOctPgmyqfyDDqrgQc0O88ji4oNcwHBxkPen7FU-SdFWCjtXqyZk9XEccp5hHypZC8EwmdLgYnFBmGBY94pFC9Ihwdxsbp_PrxKxMGkh_Q5sPayvyQi8_cQt9tDdY155lN8nzSh8XMwEKml_wwfRf9CV1nQBGypLL21_e08tJuk7pAydhj2FTO0WTWsf1Dx8AhW7kMV1wOYYeD5hzRqsyJ25qLjoU1wBSywk-013N4"
              alt="Team Collaboration"
              fill
              style={{ objectFit: "cover" }}
              className="group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <div className="text-white font-bold text-lg leading-tight font-headline">Güçlü Bir Ekip, Sağlam Bir Gelecek.</div>
              <div className="text-white/70 text-xs mt-1 font-body">Sovereign Ledger ile kontrol sizde.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
