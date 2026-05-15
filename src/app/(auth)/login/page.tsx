'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Hata: Bilgilerinizi kontrol edin');
        } else if (authError.message.includes('User not found')) {
          setError('Hata: E-posta adresi bulunamadı');
        } else {
          setError(`Hata: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      // Successful login - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Hata: Bilgilerinizi kontrol edin');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row overflow-hidden font-body bg-surface text-on-surface antialiased selection:bg-primary-fixed-dim">
      {/* Left Column: Indigo Gradient Brand Section */}
      <section className="hidden md:flex md:w-[40%] bg-gradient-to-br from-primary to-primary-container p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 mesh-pattern opacity-40"></div>
        <div className="relative z-10">
          <div className="text-on-primary-container text-xl font-extrabold tracking-tight font-headline">
            The Sovereign Ledger
          </div>
        </div>
        <div className="relative z-10 mb-20">
          <h1 className="font-headline font-extrabold text-4xl lg:text-5xl text-on-primary-container leading-tight tracking-tight">İşletmenizi mimari bir netlikle yönetin.</h1>
          <p className="mt-6 text-on-primary-container/80 text-lg font-medium max-w-sm">Modern KOBİ'ler için özel olarak tasarlanmış üst düzey finansal denetim. Her girişte hassasiyet.</p>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-[2px] bg-on-primary-container/30"></div>
          <span className="text-xs uppercase tracking-widest text-on-primary-container/60 font-label">The Executive Suite</span>
        </div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </section>

      {/* Right Column: Login Form Section */}
      <section className="flex-1 flex flex-col bg-surface-container-lowest justify-center items-center px-6 py-12 md:px-24">
        {/* Mobile Brand Header (Hidden on Desktop) */}
        <div className="md:hidden absolute top-8 left-8">
          <span className="text-primary font-headline font-extrabold tracking-tight text-lg">The Sovereign Ledger</span>
        </div>

        <div className="w-full max-w-md">
          <header className="mb-10">
            <h2 className="font-headline font-bold text-3xl text-on-surface tracking-tight">Tekrar Hoş Geldiniz</h2>
            <p className="text-on-surface-variant mt-2 font-medium">Kurumsal panelinize ve finansal raporlarınıza erişin.</p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
              <p className="text-error font-medium text-sm">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs uppercase tracking-wider font-label text-on-surface-variant font-bold">E-posta Adresi</label>
              <div className="relative group">
                <input 
                  type="email" 
                  id="email" 
                  placeholder="ad@sirket.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs uppercase tracking-wider font-label text-on-surface-variant font-bold">Şifre</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary-container transition-colors">Şifremi Unuttum</Link>
              </div>
              <div className="relative group">
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface-container-lowest bg-surface-container-low cursor-pointer transition-all" 
                />
              </div>
              <label htmlFor="remember" className="text-sm font-medium text-on-surface-variant cursor-pointer select-none">Beni Hatırla</label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 px-6 rounded-lg font-bold font-headline shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-on-surface-variant font-medium">
              Hesabınız yok mu? <Link href="/register" className="text-primary font-bold ml-1 hover:underline underline-offset-4 transition-all">Kayıt Olun</Link>
            </p>
          </div>

          {/* Subtle Tonal Branding Footer */}
          <div className="mt-20 pt-8 border-t border-outline-variant/15 flex flex-wrap justify-center gap-6">
            <span className="text-[10px] uppercase tracking-widest text-outline font-label">Gizlilik Politikası</span>
            <span className="text-[10px] uppercase tracking-widest text-outline font-label">Kullanım Koşulları</span>
            <span className="text-[10px] uppercase tracking-widest text-outline font-label">Güvenlik</span>
          </div>
        </div>

        {/* Contextual Branding Image */}
        <div className="fixed bottom-0 right-0 w-64 h-64 -mb-32 -mr-32 pointer-events-none opacity-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNbEmTkU5SsUSkROB0tEag3-Z9Hkg8AnihocmeJmLzGKuDgB10n5F9KwgIaMiRXEceZwb-kjHQgX8MQ8w0V6VLgXwl7jXeAYMX5mKCeScjVvJXEB4mTPC0VJucdLE0rJaBv9kgzBGO9W9ixwJQVp5UWeczbXCVNFbLyW8dRv_R6jSUp8KE3TKXg0LUCeKcpYAesos5t-DJSH3oXWDdFjuSHY3rfaqfkSiGBaLHg9pXt7hlcd7IyJc4c1pMyjA_ztmfYxn6DU7sbNI" 
            alt="Abstract architectural lines and glass facade" 
            className="w-full h-full object-cover rounded-full" 
          />
        </div>
      </section>
    </main>
  );
}
