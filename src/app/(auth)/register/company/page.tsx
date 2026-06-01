import React from 'react';
import Link from 'next/link';

export default function CompanyInformationPage() {
  return (
    <div className="bg-background font-body text-on-surface antialiased overflow-hidden min-h-screen relative">
      {/* Top Navigation Bar (Branding only for Onboarding) */}
      <header className="absolute top-0 w-full z-10 flex justify-between items-center px-8 py-6 bg-transparent">
        <div className="text-xl font-extrabold tracking-tight text-indigo-600 font-headline flex items-center gap-2">
          <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-white shadow-sm">
            <img src="/assets/favicon.png" alt="ENStock" className="w-full h-full object-cover" />
          </div>
          ENStock
        </div>
        <div className="flex gap-6 items-center">
          <span className="font-inter text-slate-600 font-medium text-sm">Yardım</span>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
            Satışla İletişime Geçin
          </button>
        </div>
      </header>
      
      <main className="flex min-h-screen pb-16">
        {/* Left Panel: Visual/Brand Anchor */}
        <section className="hidden lg:flex lg:w-1/2 signature-gradient relative items-center justify-center p-12 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full"></div>
            <div className="absolute bottom-1/4 -right-12 w-64 h-64 border border-white opacity-10 rounded-xl transform rotate-12"></div>
            <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-indigo-300 opacity-10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 max-w-lg text-white">
            <h1 className="font-headline font-extrabold text-5xl tracking-tight mb-8 leading-tight">İşletmeniz İçin Mimari Netlik.</h1>
            <p className="text-white/80 text-lg font-medium leading-relaxed mb-12">Karmaşık verileri küratörlüğünde bir yönetici genel bakışına dönüştürüyoruz. Dijital bir dünyada size özel bir fiziksel çalışma alanı sunmak için e-tabloların ötesine geçiyoruz.</p>
            
            {/* Micro-Grid Preview Card (The Layering Principle) */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">account_balance</span>
                </div>
                <div>
                  <div className="h-2 w-24 bg-white/30 rounded-full mb-2"></div>
                  <div className="h-2 w-16 bg-white/20 rounded-full"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-full bg-white/10 rounded-full"></div>
                <div className="h-3 w-4/5 bg-white/10 rounded-full"></div>
                <div className="h-3 w-full bg-white/10 rounded-full"></div>
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPlHCFVz1pvsEOx_DFtcGszOhyn9nTvsU1V8XVl-M8tpxbidwDbjbMJtI5FAJEorLbMRiVc6KUWhx23CH9c5BzMivpCvDdlcbZr-v4b2Tb4m3k47kwMOhBLoKXtJKPVEH6WVevMREwYqlbe9rsJx_Ic79JmdOTTT1bPJyoP--IePuE5fFBi0wFyx4gDKnKIe1xZaRMm45-Ri_-8JA1VObGp4xnhXBWs8GdSiNlP3Y6iAQoWTw_f9cZNVOlOhi7kZYzy3To91rez8o"
            alt="abstract architectural interior with clean lines high ceilings and soft natural sunlight filtering through large windows" 
          />
        </section>
        
        {/* Right Panel: Functional Form */}
        <section className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-24 bg-surface">
          <div className="w-full max-w-md mt-16 lg:mt-0">
            <header className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-inter font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Adım 2 / 2</span>
                <div className="flex flex-1 h-1 bg-surface-container rounded-full overflow-hidden">
                  <div className="w-full h-full bg-primary"></div>
                </div>
              </div>
              <h2 className="font-headline font-bold text-3xl text-on-surface mb-2">Şirket Bilgileri</h2>
              <p className="font-body text-on-surface-variant">Defter deneyiminizi özelleştirmek için bize işletmenizden biraz daha bahsedin.</p>
            </header>
            
            <form className="space-y-6">
              {/* Company Name Input */}
              <div className="space-y-2">
                <label className="font-inter text-[0.6875rem] font-bold tracking-wider uppercase text-on-surface-variant block ml-1">Şirket Adı</label>
                <input 
                  className="w-full px-4 py-3 rounded-lg border-none bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                  placeholder="Örn. ENStock Yazılım A.Ş." 
                  type="text"
                />
              </div>
              
              {/* Tax ID Input */}
              <div className="space-y-2">
                <label className="font-inter text-[0.6875rem] font-bold tracking-wider uppercase text-on-surface-variant block ml-1">Vergi No / KDV No</label>
                <input 
                  className="w-full px-4 py-3 rounded-lg border-none bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                  placeholder="XX-123456789" 
                  type="text"
                />
              </div>
              
              {/* Business Sector Dropdown */}
              <div className="space-y-2">
                <label className="font-inter text-[0.6875rem] font-bold tracking-wider uppercase text-on-surface-variant block ml-1">İş Sektörü</label>
                <div className="relative group">
                  <select defaultValue="" className="w-full px-4 py-3 rounded-lg border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 appearance-none cursor-pointer outline-none">
                    <option disabled value="">Sektörünüzü seçin</option>
                    <option>Perakende ve E-ticaret</option>
                    <option>Profesyonel Servisler</option>
                    <option>Üretim</option>
                    <option>Lojistik ve Tedarik Zinciri</option>
                    <option>Teknoloji ve SaaS</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                </div>
              </div>
              
              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <button className="w-full sm:w-auto px-8 py-3 rounded-lg bg-surface-container-highest text-on-surface font-semibold text-sm hover:bg-surface-container-high transition-colors duration-300" type="button">Geri</button>
                <button className="w-full sm:flex-1 py-3 rounded-lg signature-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity duration-300" type="submit">Kurulumu Tamamla</button>
              </div>
            </form>
            
            <footer className="mt-12 text-center">
              <p className="font-inter text-[0.6875rem] tracking-wider uppercase text-slate-500">Güvenli 256-bit şifreli bağlantı</p>
            </footer>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full flex flex-col md:flex-row justify-between items-center px-6 lg:px-12 py-4 bg-slate-50 border-t border-slate-200/15 z-20">
        <span className="font-inter text-xs tracking-wider uppercase text-slate-500 mb-2 md:mb-0 text-center md:text-left">© ENStock</span>
        <nav className="flex flex-wrap justify-center gap-4 md:gap-6">
          <Link className="font-inter text-xs tracking-wider uppercase text-slate-500 hover:text-slate-900 transition-colors duration-300" href="#">Gizlilik Politikası</Link>
          <Link className="font-inter text-xs tracking-wider uppercase text-slate-500 hover:text-slate-900 transition-colors duration-300" href="#">Kullanım Koşulları</Link>
          <Link className="font-inter text-xs tracking-wider uppercase text-slate-500 hover:text-slate-900 transition-colors duration-300" href="#">Güvenlik</Link>
        </nav>
      </footer>
    </div>
  );
}
