"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from 'xlsx';

import { getAdminBusinessAddress, uploadAvatarAction } from "./actions";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Profile States ---
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    companyName: string;
    taxId: string;
    businessSector: string;
    address: string;
    logoUrl: string | null;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  // --- Password States ---
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

  // --- Preferences States ---
  const [preferences, setPreferences] = useState({
    liveSync: true,
    darkMode: false,
  });

  // --- Initial Fetch ---
  useEffect(() => {
    async function fetchUserData() {
      setIsLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        let baseProfileData = {
          id: user.id,
          email: user.email || "",
          fullName: user.user_metadata?.full_name || "",
          avatarUrl: user.user_metadata?.avatar_url || null,
          companyName: "Sovereign Holdings Ltd.",
          taxId: "GB 938 4210 02",
          businessSector: "Doğrulanmış İşletme",
          address: user.user_metadata?.business_address || "88 Canary Wharf, Level 42, London E14 5AA",
          logoUrl: null as string | null,
        };

        if (!profileError && profileData) {
          let adminData = null;
          
          if (profileData.role !== 'admin') {
            let adminQuery = supabase
              .from("profiles")
              .select("id, company_name, tax_id, business_sector, logo_url")
              .eq("role", "admin")
              .limit(1);
            
            if (profileData.business_id) {
              adminQuery = adminQuery.eq("business_id", profileData.business_id);
            } else if (profileData.company_name) {
              adminQuery = adminQuery.eq("company_name", profileData.company_name);
            } else {
              adminQuery = null as any;
            }

            if (adminQuery) {
              const { data: fetchedAdmin } = await adminQuery.maybeSingle();
              if (fetchedAdmin) {
                adminData = fetchedAdmin;
              }
            }
          }

          baseProfileData = {
            ...baseProfileData,
            fullName: profileData.full_name || baseProfileData.fullName,
            avatarUrl: profileData.avatar_url || baseProfileData.avatarUrl,
            companyName: adminData?.company_name || profileData.company_name || baseProfileData.companyName,
            taxId: adminData?.tax_id || profileData.tax_id || baseProfileData.taxId,
            businessSector: adminData?.business_sector || profileData.business_sector || baseProfileData.businessSector,
            logoUrl: adminData?.logo_url || profileData.logo_url || baseProfileData.logoUrl,
          };

          // Try to load business settings from localStorage (user's or admin's if found)
          const targetIds = [user.id];
          if (adminData?.id) targetIds.push(adminData.id);

          for (const targetId of targetIds) {
            const localBusinessRaw = localStorage.getItem(`business_settings_${targetId}`);
            if (localBusinessRaw) {
              try {
                const localData = JSON.parse(localBusinessRaw);
                baseProfileData = {
                  ...baseProfileData,
                  companyName: localData.companyName || baseProfileData.companyName,
                  taxId: localData.taxId || baseProfileData.taxId,
                  businessSector: localData.businessSector || baseProfileData.businessSector,
                  address: localData.address || baseProfileData.address,
                  logoUrl: localData.logoUrl || baseProfileData.logoUrl,
                };
                // If we found and parsed data successfully, we can stop checking
                break; 
              } catch (e) {
                console.error("Local data parsing error:", e);
              }
            }
          }

          // If user is not admin and we found an admin, fetch the address securely from server action
          if (profileData.role !== 'admin' && adminData?.id) {
            try {
              const adminAddress = await getAdminBusinessAddress(adminData.id);
              if (adminAddress) {
                baseProfileData.address = adminAddress;
              }
            } catch (err) {
              console.error("Failed to fetch admin address:", err);
            }
          }
        }

        setProfile(baseProfileData);



        const storedPrefs = localStorage.getItem("user_preferences");
        if (storedPrefs) {
          try {
            const parsed = JSON.parse(storedPrefs);
            setPreferences(prev => ({
              ...prev,
              ...parsed
            }));
          } catch (e) {
            console.error("Preferences load error:", e);
          }
        }
      } catch (err) {
        console.error("Critical fetch error:", err);
        toast.error("Profil verileri yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [router]);

  // --- Handlers & Actions ---

  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName,
        })
        .eq("id", profile.id);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { full_name: profile.fullName }
      });

      toast.success("Profil başarıyla güncellendi.");
    } catch (err: any) {
      toast.error(`Güncelleme hatası: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya boyutu 2MB'den büyük olamaz.");
      return;
    }

    setIsAvatarUploading(true);
    const toastId = toast.loading("Fotoğraf yükleniyor...");
    try {
      // Dosyayı Base64'e dönüştür
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          
          // Server Action'ı çağır (Admin yetkileri ile yükler, RLS politikalarını atlar)
          const result = await uploadAvatarAction(base64Data, file.name, file.type, profile.id);
          
          if (!result.success || !result.publicUrl) {
            throw new Error(result.error || "Yükleme başarısız oldu.");
          }

          // Oturum bilgilerini yenilemek için auth kullanıcısını güncel duruma çekelim
          await supabase.auth.refreshSession();

          setProfile(prev => prev ? { ...prev, avatarUrl: result.publicUrl } : null);
          setAvatarTimestamp(Date.now());
          toast.success("Fotoğraf başarıyla güncellendi.", { id: toastId });
        } catch (innerErr: any) {
          toast.error(`Yükleme hatası: ${innerErr.message}`, { id: toastId });
        } finally {
          setIsAvatarUploading(false);
        }
      };
      
      reader.onerror = () => {
        throw new Error("Dosya okunamadı.");
      };
    } catch (err: any) {
      toast.error(`Yükleme hatası: ${err.message}`, { id: toastId });
      setIsAvatarUploading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Şifreler uyuşmuyor.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsPasswordUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success("Şifreniz başarıyla güncellendi.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(`Şifre hatası: ${err.message}`);
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleExportXLSX = () => {
    if (!profile) return;

    const exportData = [
      ["DEFTER YAPILANDIRMA VE MİMARİ DIŞA AKTARIM", ""],
      ["Dışa Aktarım Tarihi", new Date().toLocaleString('tr-TR')],
      ["", ""],
      ["KULLANICI PROFİLİ", ""],
      ["Kullanıcı ID", profile.id],
      ["Tam Ad Soyad", profile.fullName],
      ["E-posta", profile.email],
      ["", ""],
      ["İŞLETME YAPILANDIRMASI", ""],
      ["Şirket Adı", profile.companyName],
      ["Vergi Kimlik No", profile.taxId],
      ["İşletme Sektörü", profile.businessSector],
      ["Kayıtlı Adres", profile.address],
      ["", ""],
      ["SİSTEM NOTLARI", ""],
      ["Sürüm", "v1.0.4-stable"],
      ["Mimari Durum", "Doğrulanmış ve Senkronize"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Yapılandırma");

    // Sütun genişliklerini ayarla
    worksheet['!cols'] = [{ wch: 35 }, { wch: 55 }];

    const fileName = `defter_yapilandirma_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success("Mimari yapılandırma XLSX olarak indirildi.");
  };

  const togglePreference = (key: "liveSync" | "darkMode") => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    localStorage.setItem("user_preferences", JSON.stringify(newPrefs));
    
    if (key === "darkMode") {
      if (newPrefs.darkMode) {
        document.documentElement.classList.add("dark");
        toast.success("Karanlık mod etkinleştirildi");
      } else {
        document.documentElement.classList.remove("dark");
        toast.success("Aydınlık mod etkinleştirildi");
      }
    } else {
      toast.success("Senkronizasyon güncellendi");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">Veriler Hazırlanıyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-8">
      <Toaster position="top-right" />
      {/* Left Column: User Profile */}
      <div className="col-span-12 lg:col-span-7 space-y-8">
        {/* Profile Information Card */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Profil Bilgileri</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="relative group">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/*"
              />
              <div
                onClick={handleAvatarClick}
                className="w-32 h-32 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border-4 border-surface ring-1 ring-outline-variant/20 relative cursor-pointer"
              >
                <Image
                  src={profile?.avatarUrl ? `${profile.avatarUrl}?t=${avatarTimestamp}` : "https://lh3.googleusercontent.com/aida-public/AB6AXuBY5E2U5beAf0HPxnaZY_3SyyRPUzvnCyIBK8R7co4UYzbP8LSzDQTFYaWAjCrWObJ8b8an_PNCxkbdT39Lj-JVfjvS2Fj7hG2tLorvbgm8FWpmecUaQcfKyPK5RmWc4WQm22snPKPqESke94N3ANzD_ghrflBmp4Uu8JyNsOumn9J2tQOUOJ2K0ByOZChQ2-WhrXGeWwyNHxoNccGXrcTJE4Wab5TSUy3z3WoK2c_up-8q-jkCY5Xuf5Yw1dFITHkM_Zc-pJ04TlI"}
                  alt="Avatar"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: "cover" }}
                  className={`w-full h-full object-cover transition-opacity ${isAvatarUploading ? "opacity-30" : "opacity-100"}`}
                />

                {/* Avatar Loading Spinner */}
                {isAvatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </div>
              </div>
              <p 
                onClick={handleAvatarClick} 
                className="text-[10px] text-center mt-3 uppercase tracking-wider font-bold text-on-surface-variant cursor-pointer hover:text-primary transition-colors"
              >
                Fotoğrafı Güncelle
              </p>
            </div>
            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Ad Soyad</label>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                    type="text"
                    value={profile?.fullName || ""}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">E-posta Adresi</label>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low/50 border-none transition-all font-medium text-on-surface/50 outline-none cursor-not-allowed"
                    type="email"
                    value={profile?.email || ""}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              {isSaving ? "Kaydediliyor..." : "Profili Kaydet"}
            </button>
          </div>
        </section>

        {/* Change Password Card */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Güvenlik ve Erişim</h2>
          </div>
          <div className="space-y-6 max-w-md">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Mevcut Şifre</label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                placeholder="••••••••••••"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Yeni Şifre</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant ml-1">Yeni Şifreyi Onayla</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <div className="pt-4">
              <button
                onClick={handlePasswordUpdate}
                disabled={isPasswordUpdating}
                className="px-6 py-2.5 bg-secondary text-white font-bold rounded-lg hover:bg-on-secondary-container transition-colors text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {isPasswordUpdating ? "GÜNCELLENİYOR..." : "Güvenliği Güncelle"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Business Summary */}
      <div className="col-span-12 lg:col-span-5 space-y-8">
        {/* Business Profile Preview Card */}
        <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 bg-tertiary rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">İşletme Özeti</h2>
          </div>
          <div className="space-y-8">
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 relative overflow-hidden">
                  {profile?.logoUrl ? (
                    <Image
                      src={profile.logoUrl}
                      alt="Business Logo"
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-3xl">corporate_fare</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-on-surface">{profile?.companyName}</h3>
                  <span className="px-2 py-0.5 bg-tertiary-container/10 text-tertiary text-[10px] font-bold uppercase rounded tracking-tighter">{profile?.businessSector || "Doğrulanmış İşletme"}</span>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-outline-variant/10">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Vergi Kimlik No</span>
                  <span className="text-sm font-medium text-on-surface">{profile?.taxId}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Kayıtlı Adres</span>
                  <span className="text-sm font-medium text-right max-w-[180px] text-on-surface">{profile?.address}</span>
                </div>
              </div>
            </div>
            {/* Quick Action Card */}
            <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white shadow-xl">
              <h4 className="font-headline font-bold mb-2">Defter Yapılandırmasını Dışa Aktar</h4>
              <p className="text-indigo-200 text-xs mb-6 leading-relaxed">Yedekleme veya ikincil paketlere taşıma için mevcut mimari ayarlarınızı indirin.</p>
              <button
                onClick={handleExportXLSX}
                className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                İndir
              </button>
            </div>
          </div>
        </section>

        {/* System Preferences */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1 h-6 bg-on-surface-variant rounded-full"></div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Arayüz Kuralları</h2>
          </div>
          <div className="space-y-4">
            <div
              onClick={() => togglePreference("liveSync")}
              className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer border-b border-outline-variant/10 pb-4"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">notifications_active</span>
                <span className="text-sm font-medium text-on-surface">Canlı Senkronizasyon</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${preferences.liveSync ? "bg-primary" : "bg-outline-variant"}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${preferences.liveSync ? "right-1" : "left-1"}`}></div>
              </div>
            </div>

            <div
              onClick={() => togglePreference("darkMode")}
              className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">dark_mode</span>
                <span className="text-sm font-medium text-on-surface">Karanlık Mod</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${preferences.darkMode ? "bg-primary" : "bg-outline-variant"}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${preferences.darkMode ? "right-1" : "left-1"}`}></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
