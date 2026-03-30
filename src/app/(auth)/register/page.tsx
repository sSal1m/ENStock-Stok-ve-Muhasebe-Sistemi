import React from 'react';
import Link from 'next/link';

export default function RegisterStep1Page() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-hidden min-h-screen relative">
      <main className="flex min-h-screen">
        {/* Left Side: Visual & Brand Identity (40%) */}
        <section className="hidden md:flex md:w-[40%] signature-gradient relative overflow-hidden flex-col justify-between p-12 text-on-primary-container">
          {/* Decorative Grain/Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none" 
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCyIp4pUBjw0rCGOqJCDn_mswIm7fNRNSgFzI32zrDqcxRaUakV-W4xNl4ACJmo5N9xxZeruEHIBmKKtOuZRvuk8XKPCU4LqD4EXk6feuqKdEYG-q2WPC020G14piGRUTduoKJoBdUVYur43HKS4ygs7Vex7-CdZVob2z0r_lPL7bswaNm2C72J3XXbNguTEtJxseMGSalPn6KxKTaBLwi4-vcR_gWfBDSRZMm8GQ9wAPzZbglFXh4SD_C5IhRFcL-LRIx4JP06og4')" }}
          ></div>
          
          <div className="relative z-10">
            <div className="text-2xl font-headline font-extrabold tracking-tight">
              The Sovereign Ledger
            </div>
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-headline font-extrabold leading-tight">Deftere Katılın.<br />Geleceğinizi İnşa Edin.</h1>
              <p className="text-lg font-medium opacity-90 max-w-sm">KOBİ'ler için özel olarak tasarlanmış finansal yönetimde mimari netliği deneyimleyin.</p>
            </div>
            
            {/* Illustration Placeholder Card */}
            <div className="relative w-full aspect-square max-w-md">
              <div className="absolute inset-0 rounded-xl bg-surface-container-lowest/10 backdrop-blur-sm border border-white/10 p-6 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  alt="Business growth illustration" 
                  className="rounded-lg shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500 w-full h-full object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUvwl2pKYeO9LSgHINi2xC1xZZDercJM1xFRQ4X1VCkq-vQg2oZEMJAH40BiBZjlHmzGGl9vUbE6Q3ezT39RLDOTZGeeyxzkDaYnLFY5M8TUVPBKC5hh0TUv3Kx2ignMOlsH2N6K8tWdajsxt-UCCz8-LVbBvLoI66QLklR9nvkYVhHL73_K46WSy2RjrEd0UI7pJpLo4bnpkE28t_eHRlRGNkbzVAmVfdirm8gacYv-bD1f0bO9a2wFyB1veSDz3D13KG77hR8YI"
                />
              </div>
            </div>
          </div>
          
          <div className="relative z-10">
            <p className="text-sm font-label tracking-wider opacity-70">
              © 2024 THE SOVEREIGN LEDGER. ARCHITECTURAL CLARITY FOR SMES.
            </p>
          </div>
        </section>

        {/* Right Side: Signup Form (60%) */}
        <section className="w-full md:w-[60%] flex items-center justify-center p-6 md:p-12 lg:p-24 bg-surface">
          <div className="w-full max-w-lg space-y-10">
            {/* Header & Progress */}
            <header className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-label uppercase tracking-widest text-primary font-bold">Adım 1 / 2</span>
                <div className="flex gap-2">
                  <div className="h-1.5 w-12 rounded-full bg-primary"></div>
                  <div className="h-1.5 w-12 rounded-full bg-surface-container-high"></div>
                </div>
              </div>
              <h2 className="text-3xl font-headline font-bold text-on-surface">Hesabınızı oluşturun</h2>
              <p className="text-on-surface-variant font-medium">Çalışma alanınızı hazırlamak için temel bilgilerle başlayalım.</p>
            </header>

            {/* Form Section */}
            <form className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">Ad Soyad</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">person</span>
                  <input 
                    type="text" 
                    id="full_name" 
                    placeholder="Yasal adınızı girin" 
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest" 
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">E-posta Adresi</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
                  <input 
                    type="email" 
                    id="email" 
                    placeholder="work@company.com" 
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest" 
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">Şifre</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                  <input 
                    type="password" 
                    id="password" 
                    placeholder="••••••••" 
                    className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest" 
                  />
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-2 font-medium">En az bir rakam içeren en az 8 karakter.</p>
              </div>

              {/* CTA Section */}
              <div className="pt-4 space-y-6">
                <button type="submit" className="w-full signature-gradient text-on-primary py-4 px-8 rounded-xl font-headline font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
                  Sonraki Adım <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm font-medium text-on-surface-variant">Zaten hesabınız var mı? <Link href="/login" className="text-primary font-bold hover:underline underline-offset-4 ml-1">Giriş Yapın</Link></p>
                </div>
              </div>
            </form>

            {/* Trust Badges / Footer */}
            <footer className="pt-8 border-t border-outline-variant/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-on-surface-variant opacity-60">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span className="text-[11px] font-label uppercase tracking-widest">GÜVENLİ VERİ ŞİFRELEME</span>
              </div>
              <div className="flex gap-4">
                <Link href="#" className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Gizlilik Politikası</Link>
                <Link href="#" className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Şartlar</Link>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
