'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  companyName?: string;
  taxId?: string;
  businessSector?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [supabase] = React.useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
    taxId: '',
    businessSector: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Email validation regex
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle form submission for Step 1
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    // Validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Ad Soyad gereklidir';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    setErrors(newErrors);

    // If no errors, move to step 2
    if (Object.keys(newErrors).length === 0) {
      setCurrentStep(2);
    }
  };

  // Validate Step 2 form
  const validateStep2 = () => {
    const newErrors: FormErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Şirket adı gereklidir';
    }

    if (!formData.taxId.trim()) {
      newErrors.taxId = 'Vergi No gereklidir';
    }

    if (!formData.businessSector) {
      newErrors.businessSector = 'İş sektörü seçiniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Step 2 submission - Complete registration
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (authError) {
        toast.error(`Kayıt hatası: ${authError.message}`);
        setIsLoading(false);
        return;
      }

      const user = authData.user;
      if (!user) {
        toast.error('Kullanıcı oluşturulamadı');
        setIsLoading(false);
        return;
      }

      // Step 2: Create profile entry with company info
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            full_name: formData.fullName,
            company_name: formData.companyName,
            tax_id: formData.taxId,
            business_sector: formData.businessSector,
          },
        ]);

      if (profileError) {
        toast.error(`Profil oluşturma hatası: ${profileError.message}`);
        setIsLoading(false);
        return;
      }

      // Success - Show welcome message and redirect
      toast.success(`Hoş geldiniz, ${formData.fullName}! 🎉`);
      
      // Redirect to inventory page after a short delay
      setTimeout(() => {
        router.push('/inventory');
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Kayıt işlemi sırasında bir hata oluştu');
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[id as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [id]: undefined,
      }));
    }
  };

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
                <span className="text-xs font-label uppercase tracking-widest text-primary font-bold">
                  {currentStep === 1 ? 'Adım 1 / 2' : 'Adım 2 / 2'}
                </span>
                <div className="flex gap-2">
                  <div className={`h-1.5 w-12 rounded-full transition-all ${currentStep >= 1 ? 'bg-primary' : 'bg-surface-container-high'}`}></div>
                  <div className={`h-1.5 w-12 rounded-full transition-all ${currentStep === 2 ? 'bg-primary' : 'bg-surface-container-high'}`}></div>
                </div>
              </div>
              <h2 className="text-3xl font-headline font-bold text-on-surface">
                {currentStep === 1 ? 'Hesabınızı oluşturun' : 'Şirket Bilgileri'}
              </h2>
              <p className="text-on-surface-variant font-medium">
                {currentStep === 1 
                  ? 'Çalışma alanınızı hazırlamak için temel bilgilerle başlayalım.' 
                  : 'İşletme bilgilerinizi tamamlayın'}
              </p>
            </header>

            {/* Step 1: Personal Info Form */}
            {currentStep === 1 && (
              <form className="space-y-6" onSubmit={handleNextStep}>
                {/* Full Name */}
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">Ad Soyad</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">person</span>
                    <input 
                      type="text" 
                      id="fullName" 
                      placeholder="Yasal adınızı girin" 
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest ${errors.fullName ? 'ring-2 ring-error' : ''}`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-error font-medium">{errors.fullName}</p>
                  )}
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
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest ${errors.email ? 'ring-2 ring-error' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-error font-medium">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">Şifre</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      id="password" 
                      placeholder="••••••••" 
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest ${errors.password ? 'ring-2 ring-error' : ''}`}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-error font-medium">{errors.password}</p>
                  )}
                  <p className="text-[11px] text-on-surface-variant mt-2 font-medium">En az 6 karakter gereklidir.</p>
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
            )}

            {/* Step 2: Company Information Form */}
            {currentStep === 2 && (
              <form className="space-y-6" onSubmit={handleCompleteSetup}>
                {/* Company Name */}
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">Şirket Adı</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">business</span>
                    <input 
                      type="text" 
                      id="companyName" 
                      placeholder="e.g. Sovereign Architecture Ltd." 
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest ${errors.companyName ? 'ring-2 ring-error' : ''}`}
                    />
                  </div>
                  {errors.companyName && (
                    <p className="text-xs text-error font-medium">{errors.companyName}</p>
                  )}
                </div>

                {/* Tax ID */}
                <div className="space-y-2">
                  <label htmlFor="taxId" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">Vergi No / KDV No</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">receipt</span>
                    <input 
                      type="text" 
                      id="taxId" 
                      placeholder="XX-123456789" 
                      value={formData.taxId}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest ${errors.taxId ? 'ring-2 ring-error' : ''}`}
                    />
                  </div>
                  {errors.taxId && (
                    <p className="text-xs text-error font-medium">{errors.taxId}</p>
                  )}
                </div>

                {/* Business Sector Dropdown */}
                <div className="space-y-2">
                  <label htmlFor="businessSector" className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold">İş Sektörü</label>
                  <div className="relative group">
                    <select 
                      id="businessSector" 
                      value={formData.businessSector}
                      onChange={handleInputChange}
                      className={`w-full pl-4 pr-12 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest appearance-none cursor-pointer ${errors.businessSector ? 'ring-2 ring-error' : ''}`}
                    >
                      <option value="">Sektörünüzü seçin</option>
                      <option value="Perakende ve E-ticaret">Perakende ve E-ticaret</option>
                      <option value="Profesyonel Servisler">Profesyonel Servisler</option>
                      <option value="Üretim">Üretim</option>
                      <option value="Lojistik ve Tedarik Zinciri">Lojistik ve Tedarik Zinciri</option>
                      <option value="Teknoloji ve SaaS">Teknoloji ve SaaS</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                  </div>
                  {errors.businessSector && (
                    <p className="text-xs text-error font-medium">{errors.businessSector}</p>
                  )}
                </div>

                {/* CTA Section */}
                <div className="pt-4 space-y-6">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full signature-gradient text-on-primary py-4 px-8 rounded-xl font-headline font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <>
                        <span className="inline-block animate-spin">⏳</span> Kurulum Yapılıyor...
                      </>
                    ) : (
                      <>
                        Kurulumu Tamamla <span className="material-symbols-outlined">check_circle</span>
                      </>
                    )}
                  </button>
                  <div className="flex flex-col items-center gap-4">
                    <button 
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      disabled={isLoading}
                      className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Geri Dön
                    </button>
                  </div>
                </div>
              </form>
            )}

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
