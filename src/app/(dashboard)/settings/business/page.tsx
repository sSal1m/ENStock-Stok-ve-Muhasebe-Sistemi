"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from 'xlsx';
import { uploadBusinessLogoAction } from "../profile/actions";

export default function BusinessSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- States ---
  const [formData, setFormData] = useState({
    companyName: "ENStock Ltd. Şti.",
    taxId: "GB 938 4210 02",
    tradeRegistryNumber: "REG-77281-XL",
    address: "88 Canary Wharf, Level 42, London E14 5AA",
    logoUrl: null as string | null,
    currency: "TRY",
    fiscalYearStart: "2024-01-01",
    businessSector: "Doğrulanmış İşletme",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());

  // --- Initial Fetch ---
  useEffect(() => {
    async function fetchBusinessData() {
      setIsLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
          return;
        }

        // 1. First, load from localStorage (Fast Fallback)
        const localDataRaw = localStorage.getItem(`business_settings_${user.id}`);
        if (localDataRaw) {
          try {
            const localData = JSON.parse(localDataRaw);
            setFormData(prev => ({ ...prev, ...localData }));
          } catch (e) {
            console.error("Local data parsing error:", e);
          }
        }

        // 2. Then, fetch from Supabase (Source of Truth for specific fields)
        const { data, error } = await supabase
          .from("profiles")
          .select("company_name, tax_id, business_sector, logo_url, default_currency")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Supabase fetch error (stringified):", JSON.stringify(error, null, 2));
          console.error("Supabase error code:", error.code);
        } else if (data) {
          console.log("Supabase fetch success:", data);
          // Merge Supabase data onto form (overwriting defaults/local for these fields)
          setFormData(prev => ({
            ...prev,
            companyName: data.company_name || prev.companyName,
            taxId: data.tax_id || prev.taxId,
            businessSector: data.business_sector || prev.businessSector,
            logoUrl: data.logo_url || prev.logoUrl,
            currency: data.default_currency || prev.currency,
          }));
        }
      } catch (err) {
        console.error("Critical fetch error:", err);
        toast.error("Ayarlar yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBusinessData();
  }, [router]);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateBusiness = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Bilgiler güncelleniyor...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı.");

      // 1. Save all fields to localStorage (Reliable local persistence)
      localStorage.setItem(`business_settings_${user.id}`, JSON.stringify(formData));

      // 2. Save schema-compliant fields to Supabase.
      // UPDATE kullanılıyor (upsert değil) çünkü profil satırı zaten var olmalı
      // (auth.signUp trigger'ı oluşturuyor). Upsert NOT NULL kolon (full_name)
      // gerektirdiği için yeni satır insert path'inde patlıyordu.
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: formData.companyName,
          tax_id: formData.taxId,
          business_sector: formData.businessSector,
          default_currency: formData.currency,
        })
        .eq("id", user.id);

      // Also save address to auth user_metadata so it can be retrieved by employees
      await supabase.auth.updateUser({
        data: { business_address: formData.address }
      });


      if (error) {
        console.warn("Supabase partial save error (likely missing columns, saved to local instead):", error.message);
        // We don't throw error here because we saved to local storage
      }

      // İşletme default'u değiştiğinde mevcut tüm sayfaların hook'larındaki
      // sayfa-bazlı override'ı temizle ki yeni default hemen etkili olsun.
      // (Kullanıcı bilinçli olarak değiştirdiği için artık eski override anlamsız.)
      localStorage.removeItem("preferred_currency_overridden");
      localStorage.setItem("preferred_currency", formData.currency);

      toast.success("Ayarlar başarıyla güncellendi.", { id: toastId });
    } catch (err: any) {
      toast.error(`Güncelleme hatası: ${err.message}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo boyutu 2MB'den büyük olamaz.");
      return;
    }

    setIsLogoUploading(true);
    const toastId = toast.loading("Logo yükleniyor...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Oturum bulunamadı.", { id: toastId });
        return;
      }

      // Dosyayı Base64 dizesine dönüştür
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const result = await uploadBusinessLogoAction(base64Data, file.name, file.type, user.id);

          if (!result.success) {
            toast.error(`Logo yükleme hatası: ${result.error}`, { id: toastId });
            setIsLogoUploading(false);
            return;
          }

          setFormData(prev => {
            const newData = { ...prev, logoUrl: result.publicUrl || null };
            // Sync logo update to local storage too
            localStorage.setItem(`business_settings_${user.id}`, JSON.stringify(newData));
            return newData;
          });
          setLogoTimestamp(Date.now());
          toast.success("Logo başarıyla yüklendi.", { id: toastId });
          setIsLogoUploading(false);
        } catch (innerErr: any) {
          toast.error(`Logo yükleme hatası: ${innerErr.message}`, { id: toastId });
          setIsLogoUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error("Dosya okunurken bir hata oluştu.", { id: toastId });
        setIsLogoUploading(false);
      };
    } catch (err: any) {
      toast.error(`Logo yükleme hatası: ${err.message}`, { id: toastId });
      setIsLogoUploading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const toastId = toast.loading("Vergi analizleri derleniyor ve rapor oluşturuluyor...");

    try {
      // Veri hazırlama simülasyonu
      await new Promise(resolve => setTimeout(resolve, 2000));

      const reportData = [
        ["İŞLETME VERGİ ANALİZ RAPORU", ""],
        ["Oluşturma Tarihi", new Date().toLocaleString('tr-TR')],
        ["", ""],
        ["GENEL BİLGİLER", ""],
        ["Şirket Adı", formData.companyName],
        ["Vergi Kimlik No", formData.taxId],
        ["İşletme Sektörü", formData.businessSector],
        ["Kayıtlı Adres", formData.address],
        ["Para Birimi", formData.currency],
        ["", ""],
        ["MALİ PROJEKSİYON (Q1 - 2024)", ""],
        ["Tahmini Gelir", "125.000,00"],
        ["Giderler", "45.000,00"],
        ["Vergi Öncesi Kar", "80.000,00"],
        ["Tahmini Vergi Yükü (%20)", "16.000,00"],
        ["Net Durum", "64.000,00"],
        ["", ""],
        ["Not", "Bu rapor sistem tarafından otomatik oluşturulan bir projeksiyondur. Kesin veriler için muhasebe kayıtlarını kontrol ediniz."]
      ];

      // Excel dosyası oluşturma
      const worksheet = XLSX.utils.aoa_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vergi Analiz");

      // Sütun genişliklerini ayarla
      worksheet['!cols'] = [{ wch: 30 }, { wch: 50 }];

      // İndirmeyi başlat
      const fileName = `Vergi_Raporu_${formData.companyName.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success("Rapor başarıyla oluşturuldu ve indirildi.", { id: toastId });
    } catch (err: any) {
      toast.error(`Rapor oluşturma hatası: ${err.message}`, { id: toastId });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-tertiary/20 border-t-tertiary rounded-full animate-spin mb-4"></div>
          <p className="text-on-surface-variant font-bold text-sm uppercase tracking-widest text-tertiary">Müessese Kayıtları Alınıyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Toaster position="top-right" />
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
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                className="hidden"
                accept="image/*"
              />
              <div
                onClick={handleLogoClick}
                className="w-32 h-32 rounded-lg bg-surface-container-low flex items-center justify-center overflow-hidden border-4 border-surface ring-1 ring-outline-variant/20 relative cursor-pointer"
              >
                {formData.logoUrl ? (
                  <Image
                    src={`${formData.logoUrl}?t=${logoTimestamp}`}
                    alt="Company Logo"
                    fill
                    style={{ objectFit: "cover" }}
                    className={`w-full h-full object-cover transition-opacity ${isLogoUploading ? "opacity-30" : "opacity-100"}`}
                  />
                ) : (
                  <div className="w-20 h-20 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-500/20">
                    <span className="material-symbols-outlined text-primary text-4xl">corporate_fare</span>
                  </div>
                )}

                {isLogoUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-tertiary/20 border-t-tertiary rounded-full animate-spin"></div>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </div>
              </div>
              <p className="text-[10px] text-center mt-3 uppercase tracking-wider font-bold text-on-surface-variant">Logo Güncelle</p>
            </div>
            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">İşletme Tam Adı</label>
                  <input
                    name="companyName"
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                    type="text"
                    value={formData.companyName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Vergi Kimlik No</label>
                    <input
                      name="taxId"
                      className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                      type="text"
                      value={formData.taxId}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Ticari Sicil No</label>
                    <input
                      name="tradeRegistryNumber"
                      className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                      type="text"
                      value={formData.tradeRegistryNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Kayıtlı Adres</label>
                  <textarea
                    name="address"
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none min-h-[100px]"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-end">
            <button
              onClick={handleUpdateBusiness}
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-br from-tertiary to-tertiary-container text-white font-bold rounded-lg shadow-lg shadow-tertiary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              {isSaving ? "Kaydediliyor..." : "Bilgileri Güncelle"}
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
              <select
                name="currency"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none appearance-none"
                value={formData.currency}
                onChange={handleInputChange}
              >
                <option value="TRY">TRY (₺) - Türk Lirası</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Mali Yıl Başlangıcı</label>
              <input
                name="fiscalYearStart"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                type="date"
                value={formData.fiscalYearStart}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleUpdateBusiness}
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-br from-secondary to-secondary-container text-white font-bold rounded-lg shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              {isSaving ? "Kaydediliyor..." : "Finansal Yapılandırmayı Kaydet"}
            </button>
          </div>
        </section>
      </div>

      {/* Right Column: Preview & Stats */}
      <div className="col-span-12 lg:col-span-5 space-y-8">
        {/* Business Profile Preview Card (Sticky) */}
        <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10 sticky top-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Önizleme</h2>
          </div>
          <div className="space-y-8">
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-500/20 relative overflow-hidden">
                  {formData.logoUrl ? (
                    <Image
                      src={`${formData.logoUrl}?t=${logoTimestamp}`}
                      alt="Logo Preview"
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-3xl">corporate_fare</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-on-surface leading-tight min-h-[1.5rem]">{formData.companyName}</h3>
                  <span className="px-2 py-0.5 bg-tertiary-container/10 text-tertiary text-[10px] font-bold uppercase rounded tracking-tighter">{formData.businessSector}</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                Bu bilgiler faturalarınızda, raporlarınızda ve resmi yazışmalarınızda kullanılacaktır.
              </p>
              <div className="pt-4 border-t border-outline-variant/10 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-on-surface-variant font-bold uppercase tracking-widest">Para Birimi</span>
                  <span className="text-on-surface font-bold">{formData.currency}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-on-surface-variant font-bold uppercase tracking-widest">Vergi No</span>
                  <span className="text-on-surface font-bold">{formData.taxId}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Card */}
            <div className="p-6 bg-gradient-to-br from-tertiary to-tertiary-container rounded-xl text-white shadow-xl">
              <h4 className="font-headline font-bold mb-2">Vergi Raporlarını Hazırla</h4>
              <p className="text-tertiary-fixed text-xs mb-6 leading-relaxed">Mevcut işletme ayarlarıyla çeyrek dönem vergi projeksiyonlarını oluşturun.</p>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingReport ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-sm">analytics</span>
                )}
                {isGeneratingReport ? "HAZIRLANIYOR..." : "Raporu İndir"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
