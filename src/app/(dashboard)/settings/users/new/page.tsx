
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { inviteUserAction } from "./actions";

export default function InviteUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<{ email: string; role: string }>({
    email: "",
    role: "accounting"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Lütfen e-posta adresini girin.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Davet gönderiliyor...");

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Oturum bulunamadı.");

      // 2. Call server action for real invitation email
      const result = await inviteUserAction({
        email: formData.email,
        role: formData.role
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(`${formData.email} sisteme başarıyla eklendi!`, { id: toastId });
      
      if (result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
        setInviteCode(result.code || null);
      } // else {
      //   router.push("/settings/users");
      // }
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

            {/* Davet Bağlantısı Paneli - Başarı Durumu (Slide-Down Animation) */}
            <div
              className={`grid transition-all duration-500 ease-in-out ${
                inviteUrl
                  ? "grid-rows-[1fr] opacity-100 mt-6"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="bg-indigo-600 rounded-xl p-3 shadow-sm flex-shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-3xl">check</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-slate-800 font-bold text-lg">Harika! Davet Hazır.</h3>
                      <p className="text-slate-500 text-sm leading-relaxed mt-1">
                        Mail sunucusu kısıtlamalarına takılmadan ekibinizi büyütebilirsiniz. Aşağıdaki linki kopyalayıp yeni üyenize iletmeniz yeterli!
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mt-6 relative z-10">
                    {inviteCode && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase font-label">Davet Kodu (6 Haneli)</div>
                          <div className="text-2xl font-black tracking-widest text-indigo-600 font-headline mt-1">{inviteCode}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(inviteCode);
                            toast.success("Davet kodu kopyalandı!");
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                          Kodu Kopyala
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                      <div className="flex-1 w-full">
                        <div className="text-[10px] text-slate-400 font-bold uppercase font-label mb-1">Davet Bağlantısı</div>
                        <input
                          type="text"
                          readOnly
                          value={inviteUrl ?? ""}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-600 text-sm w-full outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (inviteUrl) {
                            navigator.clipboard.writeText(inviteUrl);
                            toast.success("Bağlantı kopyalandı!");
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors w-full sm:w-auto flex-shrink-0 self-end h-[46px]"
                      >
                        <span className="material-symbols-outlined text-xl">content_copy</span>
                        Linki Kopyala
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500 rounded-full w-2 h-2 animate-pulse"></span>
                      <span className="text-slate-400 font-semibold text-xs tracking-wider uppercase">Bağlantı Aktif</span>
                    </div>
                    <button
                      onClick={() => router.push("/settings/users")}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Ekip Listesine Dön
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
