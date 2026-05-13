"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { inviteUserAction } from "./actions";

export default function InviteUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "accounting"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Davet gönderiliyor...");

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Oturum bulunamadı.");

      // 1. Get current user's company context
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", authUser.id)
        .single();

      const company = myProfile?.company_name || "Belirtilmemiş";

      // 2. Call server action for real invitation email
      const result = await inviteUserAction({
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        company_name: company
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(`${formData.full_name} sisteme başarıyla eklendi!`, { id: toastId });
      
      if (result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
      } else {
        router.push("/settings/users");
      }
    } catch (err: any) {
      toast.error("Hata oluştu: " + err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Form Section */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Ekibe Katılmaya Davet Et</h2>
            <p className="text-on-surface-variant leading-relaxed font-body">Yeni çalışma arkadaşınızın bilgilerini girin ve ekosistemine dahil olması için bir davet gönderin.</p>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
            <form className="space-y-6" onSubmit={handleSubmit}>
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
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                <button 
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 px-6 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-body disabled:opacity-50" 
                  type="submit"
                  disabled={isSubmitting}
                >
                  <span className="material-symbols-outlined">{isSubmitting ? "sync" : "send"}</span>
                  {isSubmitting ? "Gönderiliyor..." : "Davet Oluştur"}
                </button>
              </div>
            </form>

            {/* Invite Link Panel (Shown after success) */}
            {inviteUrl && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-8xl">link</span>
                  </div>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-indigo-600">check_circle</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-indigo-900 font-headline mb-1">Davet Bağlantısı Hazır!</h3>
                      <p className="text-sm text-indigo-800/80 font-body leading-relaxed">
                        Ücretsiz SMTP servislerindeki kotalar veya spam filtreleri nedeniyle yaşanabilecek teslimat sorunlarını aşmak için sistem, kopyalayıp doğrudan paylaşabileceğiniz güvenilir bir davet bağlantısı oluşturdu.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        readOnly 
                        value={inviteUrl} 
                        className="w-full bg-white border border-indigo-200 text-indigo-900 text-sm rounded-lg px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        toast.success("Bağlantı kopyalandı!");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      Kopyala
                    </button>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-indigo-100/50 flex justify-end">
                    <button 
                      onClick={() => router.push('/settings/users')}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 font-body"
                    >
                      Ekip Listesine Dön <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              <div className="text-white/70 text-xs mt-1 font-body">Sistemle kontrol sizde.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
