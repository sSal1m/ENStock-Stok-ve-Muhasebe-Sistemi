"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      saveThemePreference(true);
    } else {
      document.documentElement.classList.remove('dark');
      saveThemePreference(false);
    }
  };

  const saveThemePreference = (isDark: boolean) => {
    try {
      const prefs = localStorage.getItem('user_preferences');
      let parsed = prefs ? JSON.parse(prefs) : {};
      parsed.darkMode = isDark;
      localStorage.setItem('user_preferences', JSON.stringify(parsed));
    } catch (e) {
      console.error("Failed to save preferences", e);
    }
  };
  return (
    <div className="bg-background font-body text-on-surface antialiased overflow-x-hidden min-h-screen selection:bg-primary-fixed-dim flex flex-col">

      {/* Top Blue Strip / Banner */}
      <div className="signature-gradient text-on-primary text-xs font-bold tracking-widest uppercase py-2.5 px-4 text-center z-50 relative">
        <span className="opacity-90">Yeni v2.0 Yayında:</span> İşletmenizin finansal durumunu artık gerçek zamanlı izleyin.
        <Link href="/register" className="ml-3 underline underline-offset-4 hover:opacity-80 transition-opacity">Hemen İncele</Link>
      </div>

      {/* Header */}
      <header className="sticky top-0 w-full z-40 flex justify-between items-center px-6 lg:px-12 py-4 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm">
        <div className="text-2xl font-extrabold tracking-tighter text-primary font-headline flex items-center gap-2">
          {/* Logo icon */}
          <div className="w-8 h-8 rounded-lg signature-gradient flex items-center justify-center text-on-primary shadow-sm bg-primary text-white">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          </div>
          The Sovereign Ledger
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <Link href="#features" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Özellikler</Link>
          <Link href="#pricing" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Fiyatlandırma</Link>
          <Link href="#security" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Güvenlik</Link>
        </nav>
        <div className="flex gap-4 items-center">
          {/* Tema Seçim Butonu */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Temayı Değiştir"
            aria-label="Temayı Değiştir"
          >
            <span className="material-symbols-outlined text-[20px]">
              {darkMode ? "dark_mode" : "light_mode"}
            </span>
          </button>

          <Link href="/login" className="hidden sm:block text-sm font-semibold text-primary hover:text-on-primary-fixed-variant transition-colors">
            Giriş Yap
          </Link>
          <Link href="/register" className="bg-primary hover:bg-primary/90 text-on-primary text-sm font-bold px-5 py-2.5 rounded-lg shadow-md transition-all">
            Ücretsiz Başlayın
          </Link>
        </div>
      </header>

      {/* Modern Professional Hero Section - Split Layout */}
      <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 px-6 lg:px-12 flex-grow flex items-center">
        {/* Subtle CSS Grid Background for Tech/Professional feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[100px] pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">

          {/* Left Text Content */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-105">
              <span className="flex h-2 w-2 rounded-full bg-primary relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              </span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-100 font-label">KOBİ'ler İçin Üretildi</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold font-headline tracking-tight text-on-surface leading-[1.1]">
              İşletmenizin Muhasebe <br className="hidden lg:block" />
              {/* Fixed bg-clip-text issue here! */}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#645efb]">Mimarisini Kurun.</span>
            </h1>

            <p className="text-lg lg:text-xl font-medium text-on-surface-variant max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              E-tabloların kargaşasından kurtulun. Büyüyen işletmeler için tasarlanmış kurumsal kalitede finans, stok ve cari hesap yönetimi yazılımı.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Link href="/register" className="w-full sm:w-auto signature-gradient text-on-primary px-8 py-4 rounded-xl font-headline font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                Hemen Başlayın
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              <Link href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl font-headline font-bold text-lg text-on-surface bg-white border border-outline-variant/30 hover:bg-surface-container-low transition-all flex items-center justify-center gap-2 shadow-sm">
                Sistemi İncele
              </Link>
            </div>

            {/* Trust Mini-Stats */}
            <div className="pt-8 flex items-center justify-center lg:justify-start gap-6 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-background flex items-center justify-center text-xs font-bold text-on-surface">₺</div>
                <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-background flex items-center justify-center text-xs font-bold text-on-surface">%</div>
                <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-background flex items-center justify-center text-xs font-bold text-primary">+</div>
              </div>
              <p className="text-sm font-semibold text-on-surface-variant text-left leading-tight">
                <strong className="text-on-surface">1000'den fazla</strong><br />
                KOBİ tarafından kullanılıyor.
              </p>
            </div>
          </div>

          {/* Right Visual Content */}
          <div className="relative mx-auto lg:ml-auto w-full max-w-md lg:max-w-none">
            {/* Decorative card 1 */}
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-secondary/10 rounded-3xl blur-2xl"></div>
            {/* Decorative card 2 */}
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-primary/10 rounded-3xl blur-2xl animate-pulse"></div>

            {/* The Main Graphic container */}
            <div className="relative bg-white/40 backdrop-blur-3xl border border-white/60 p-2 md:p-3 rounded-3xl shadow-2xl transform lg:rotate-2 hover:rotate-0 transition-transform duration-700">
              {/* Fake Browser window */}
              <div className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/20 shadow-inner block">
                {/* Browser tab bar */}
                <div className="bg-surface-container-low px-4 py-3 flex items-center gap-2 border-b border-outline-variant/10">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                  <div className="ml-4 flex-grow"><div className="h-2 w-32 bg-outline-variant/20 rounded-full"></div></div>
                </div>
                {/* Content Area - Using the image */}
                <div className="aspect-[4/3] bg-surface relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyIp4pUBjw0rCGOqJCDn_mswIm7fNRNSgFzI32zrDqcxRaUakV-W4xNl4ACJmo5N9xxZeruEHIBmKKtOuZRvuk8XKPCU4LqD4EXk6feuqKdEYG-q2WPC020G14piGRUTduoKJoBdUVYur43HKS4ygs7Vex7-CdZVob2z0r_lPL7bswaNm2C72J3XXbNguTEtJxseMGSalPn6KxKTaBLwi4-vcR_gWfBDSRZMm8GQ9wAPzZbglFXh4SD_C5IhRFcL-LRIx4JP06og4"
                    alt="Dashboard architectural render"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay widget on image for realism */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-on-surface tracking-wide">Aylık Finansal Büyüme</span>
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">trending_up</span> +24%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="w-[74%] h-full bg-primary rounded-full relative">
                        <div className="absolute top-0 right-0 w-8 h-full bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trust Border/Divider */}
      <div className="border-y border-outline-variant/10 bg-surface-container-lowest/50 dark:bg-slate-900/50 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-wrap justify-center items-center gap-12 lg:gap-24 opacity-50 grayscale">
          {/* Fake company logos to add standard SaaS professional look */}
          <div className="font-headline font-extrabold text-xl tracking-tighter">VENDECO</div>
          <div className="font-headline font-bold text-xl tracking-widest uppercase">Strata</div>
          <div className="font-headline font-black text-xl italic">NexFlow</div>
          <div className="font-headline font-medium text-xl border-2 border-current px-2 py-0.5">MATRIX</div>
          <div className="font-headline font-light text-xl tracking-widest lowercase">aeros</div>
        </div>
      </div>

      {/* Feature Section (The Layering Principle) */}
      <section id="features" className="py-24 px-6 lg:px-12 relative z-10 bg-surface dark:bg-[#0f111a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center md:text-left mb-16 md:flex md:justify-between md:items-end">
            <div className="max-w-2xl">
              <h2 className="text-sm font-bold tracking-widest uppercase text-primary mb-3">Sistem Mimarisi</h2>
              <h3 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-on-surface mb-4">
                Karmaşıklığı ortadan kaldıran profesyonel modüller.
              </h3>
              <p className="text-lg font-medium text-on-surface-variant">
                İşletmenizin kurumsal bir yapıya bürünmesi için tasarlanan 360 derece yönetim araçları.
              </p>
            </div>
            <Link href="/register" className="hidden md:inline-flex items-center gap-2 text-primary font-bold hover:bg-primary/5 px-4 py-2 rounded-lg transition-all group">
              Tüm Detayları Gör <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl signature-gradient flex items-center justify-center text-on-primary shadow-lg shadow-primary/20 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined !text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
              </div>
              <h3 className="text-xl font-extrabold font-headline mb-3 text-on-surface">Zeki Stok Takibi</h3>
              <p className="text-on-surface-variant font-medium leading-relaxed">
                Raflarınızdaki her bir ürünü merkezi bir sistemle takip edin. Kritik seviye uyarıları ile envanter krizlerini başlamadan önleyin.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-white shadow-lg shadow-secondary/20 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined !text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
              </div>
              <h3 className="text-xl font-extrabold font-headline mb-3 text-on-surface">Cari Yönetimi</h3>
              <p className="text-on-surface-variant font-medium leading-relaxed">
                Müşteri ve tedarikçi borç-alacak süreçlerini şeffaflaştırın. Otomatik hatırlatıcılar ile güçlü bir nakit akışı inşa edin.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-inverse-surface flex items-center justify-center text-inverse-on-surface shadow-lg mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined !text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
              </div>
              <h3 className="text-xl font-extrabold font-headline mb-3 text-on-surface">Gelişmiş Raporlar</h3>
              <p className="text-on-surface-variant font-medium leading-relaxed">
                Gerçek zamanlı karlılık verilerinizi ve büyüme metriklerini dinamik panellerde inceleyin. Stratejik kararlarınızı verilere dayandırın.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Super CTA Section */}
      <section className="py-24 px-6 lg:px-12 bg-surface-container-low dark:bg-slate-950/80 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 signature-gradient opacity-[0.03]"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[80px]"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 bg-white/50 backdrop-blur-xl border border-white p-12 lg:p-16 rounded-[40px] shadow-xl">
          <h2 className="text-4xl lg:text-5xl font-extrabold font-headline tracking-tight text-on-surface mb-6">
            Finansal devriminizi bugün başlatın.
          </h2>
          <p className="text-lg text-on-surface-variant mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            Karmaşık tabloları rafa kaldırın. Sovereign Ledger hesabı açmak yalnızca 2 dakika sürer ve 14 gün boyunca tamamen ücretsizdir.
          </p>
          <Link href="/register" className="inline-flex signature-gradient text-on-primary px-10 py-5 rounded-2xl font-headline font-extrabold text-xl shadow-2xl shadow-primary/30 hover:-translate-y-1 active:scale-[0.98] transition-all items-center gap-3 group">
            Hemen Ücretsiz Başlayın
            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">rocket_launch</span>
          </Link>
          <p className="text-xs font-semibold text-on-surface-variant mt-6 uppercase tracking-widest opacity-70">
            Kredi kartı gerekmez
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-inverse-surface text-inverse-on-surface py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="text-2xl font-extrabold tracking-tighter text-white font-headline mb-4 flex items-center gap-2 opacity-90">
              <span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              The Sovereign Ledger
            </div>
            <p className="text-sm font-medium text-outline-variant max-w-sm leading-relaxed">
              Modern işletmeler için tasarlanmış kurumsal mimarili finansal yönetim platformu. Güven, şeffaflık ve güç.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-2 inline-block">Proje</h4>
            <nav className="flex flex-col gap-4">
              <Link href="#" className="text-sm font-medium text-outline-variant hover:text-white transition-colors">Özellikler</Link>
              <Link href="#" className="text-sm font-medium text-outline-variant hover:text-white transition-colors">Fiyatlandırma</Link>
              <Link href="#" className="text-sm font-medium text-outline-variant hover:text-white transition-colors">Sürüm Notları (v2.0)</Link>
            </nav>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-2 inline-block">Yasal</h4>
            <nav className="flex flex-col gap-4">
              <Link href="#" className="text-sm font-medium text-outline-variant hover:text-white transition-colors">Gizlilik Politikası</Link>
              <Link href="#" className="text-sm font-medium text-outline-variant hover:text-white transition-colors">Kullanım Koşulları</Link>
              <Link href="#" className="text-sm font-medium text-outline-variant hover:text-white transition-colors">Güvenlik Merkezi</Link>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-label uppercase tracking-widest text-outline-variant opacity-70">
            © 2024 THE SOVEREIGN LEDGER. ARCHITECTURAL CLARITY FOR SMES.
          </p>
          {/* Social mock links */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-bold text-xs">in</div>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-bold text-xs">X</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
