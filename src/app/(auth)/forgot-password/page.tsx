'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('E-posta adresi girin');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        toast.error(`Hata: ${error.message}`);
        setIsLoading(false);
        return;
      }

      // Success - show confirmation message
      setIsSuccess(true);
      toast.success('Sıfırlama bağlantısı gönderildi!');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Şifre sıfırlama işleminde hata oluştu');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background font-body text-on-surface antialiased">
      {/* TopNavBar */}
      <header className="absolute top-0 w-full z-10 flex justify-between items-center px-8 py-6">
        <div className="text-xl font-extrabold tracking-tighter text-slate-900 font-headline">
          The Sovereign Ledger
        </div>
        <div className="flex gap-6 items-center">
          <Link href="#" className="font-headline font-bold text-sm tracking-tight text-slate-500 hover:text-indigo-700 transition-colors">Support</Link>
          <Link href="#" className="font-headline font-bold text-sm tracking-tight text-slate-500 hover:text-indigo-700 transition-colors">Security</Link>
        </div>
      </header>

      <main className="min-h-screen flex flex-col md:flex-row">
        {/* Left Side: Visual Anchor */}
        <section className="hidden md:flex w-1/2 signature-gradient relative flex-col items-center justify-center p-12 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-[-5%] left-[-5%] w-64 h-64 rounded-full bg-primary-container/20 blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center max-w-md">
            <div className="mb-8 w-24 h-24 bg-white/10 backdrop-blur-[12px] rounded-3xl flex items-center justify-center text-on-primary shadow-2xl">
              <span className="material-symbols-outlined !text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock_person</span>
            </div>
            <h1 className="font-headline text-4xl lg:text-5xl font-extrabold text-on-primary tracking-tight leading-tight mb-6">
              Güvenli Muhasebe Yönetimi
            </h1>
            <p className="text-primary-fixed font-medium text-lg opacity-90 leading-relaxed">
              Finansal verilerinizi mimari bir titizlikle koruyor, şeffaflık ve güveni teknolojimizle birleştiriyoruz.
            </p>
            
            {/* Abstract Data Visualization Decor */}
            <div className="mt-16 w-full flex gap-4 justify-center opacity-60">
              <div className="h-32 w-2 bg-white/20 rounded-full self-end"></div>
              <div className="h-48 w-2 bg-white/40 rounded-full self-end"></div>
              <div className="h-24 w-2 bg-white/30 rounded-full self-end"></div>
              <div className="h-40 w-2 bg-white/50 rounded-full self-end"></div>
              <div className="h-28 w-2 bg-white/20 rounded-full self-end"></div>
            </div>
          </div>
          
          {/* Background Image Integration */}
          <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8cO07oywB3h-6wdB9UzZd3DWkoCoh4_wwCL0evN-XbVxhJFA-P6bW1OslCxjJOCafhCikp3_ClVlf73Vi-vANCpg-uYhO1TvCK9YWELXLhg6bLdoejaw3oYzYxtCNvDHDRMUT9Iz_0D-wpYVpFJkq9myhKV0UdSd8pKQrgmfoF5zOSibGzhbCeWYtYH5kCVSRpEHhriZF_3Ts5Po2zmOdLhCSYHs6vrJrQp-POi8m_5XTlKz2mDskYErB668gEEgY2M1epK3gApM" 
              alt="abstract cyber security grid with glowing blue nodes and digital connection lines on a dark background" 
            />
          </div>
        </section>

        {/* Right Side: Form Content */}
        <section className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-surface-container-low">
          <div className="w-full max-w-md">
            {/* Branding for Mobile */}
            <div className="md:hidden mb-12 flex justify-center">
              <span className="font-headline font-extrabold text-2xl tracking-tighter text-primary">Sovereign Ledger</span>
            </div>
            <div className="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-[0_10px_30px_-5px_rgba(19,27,46,0.06)] border border-outline-variant/10">
              <header className="mb-8 text-center md:text-left">
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface tracking-tight mb-3">
                  Şifrenizi mi Unuttunuz?
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Şifrenizi sıfırlamanız için size bir e-posta göndereceğiz. Lütfen sistemde kayıtlı e-posta adresinizi girin.
                </p>
              </header>

              {/* Success Message */}
              {isSuccess && (
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-600">check_circle</span>
                    <div>
                      <p className="font-semibold text-green-800 text-sm">Başarılı!</p>
                      <p className="text-green-700 text-sm">E-posta adresinizi kontrol edin</p>
                    </div>
                  </div>
                </div>
              )}
              
              {!isSuccess && (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">
                      E-posta Adresi
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                        <span className="material-symbols-outlined text-lg">mail</span>
                      </div>
                      <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        placeholder="ad@sirketiniz.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                        className="block w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-0 rounded-lg text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                      />
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full signature-gradient text-on-primary font-headline font-bold py-4 rounded-lg shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  >
                    <span>{isLoading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}</span>
                    {!isLoading && <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                  </button>
                </form>
              )}
              
              {/* Navigation Back */}
              <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-on-primary-fixed-variant transition-colors group">
                  <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">arrow_back</span>
                  Giriş Sayfasına Dön
                </Link>
              </div>
            </div>
            
            {/* Footer Links */}
            <footer className="mt-8 flex justify-center gap-6 text-xs font-medium text-outline">
              <Link href="#" className="hover:text-on-surface transition-colors">Gizlilik Politikası</Link>
              <span className="w-1 h-1 bg-outline-variant rounded-full self-center"></span>
              <Link href="#" className="hover:text-on-surface transition-colors">Kullanım Şartları</Link>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
