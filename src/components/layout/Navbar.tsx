"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserProfile {
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
}

export default function Navbar() {
  const [profile, setProfile] = useState<UserProfile>({
    full_name: null,
    company_name: null,
    avatar_url: null,
  });
  const [loading, setLoading] = useState(true);

  // ── Kullanıcı Profil Bilgilerini Çek ────────────────────────────────────
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setLoading(false);
        return;
      }

      const avatarUrl = user.user_metadata?.avatar_url || null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile({
          full_name: data.full_name || user.user_metadata?.full_name || "Kullanıcı",
          company_name: data.company_name || "Şirket",
          avatar_url: avatarUrl,
        });
      } else {
        setProfile({
          full_name: user.user_metadata?.full_name || "Kullanıcı",
          company_name: "Şirket",
          avatar_url: avatarUrl,
        });
      }
      setLoading(false);
    }

    fetchProfile();

    // Dinamik profil güncellemelerini yakalamak için auth state dinleyici
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setProfile(prev => ({
          ...prev,
          avatar_url: session.user.user_metadata?.avatar_url || null,
          full_name: session.user.user_metadata?.full_name || prev.full_name
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-surface border-b border-surface-container-high shadow-sm flex justify-between items-center px-6 text-sm font-medium transition-all">
      {/* Sol: Mobil Logo & Hızlı Bağlantılar */}
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold text-primary md:hidden">
          {loading ? 'Yükleniyor...' : (profile.company_name || 'Şirketim')}
        </span>
        <div className="hidden md:flex items-center gap-6">
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">
            Hızlı İşlemler
          </a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">
            Raporlar
          </a>
        </div>
      </div>

      {/* Sağ: Arama, Bildirimler, Kullanıcı */}
      <div className="flex items-center gap-4">
        {/* Arama Kutusu */}
        <div className="hidden sm:flex items-center bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container-high transition-all">
          <span className="material-symbols-outlined text-on-surface-variant/70 text-lg mr-2">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-48 text-on-surface outline-none placeholder:text-on-surface-variant/40"
            placeholder="Ürün, fatura veya cari ara..."
            type="text"
          />
        </div>

        {/* Bildirim & Ayarlar */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors active:scale-95 duration-200">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors active:scale-95 duration-200">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>

        <div className="h-8 w-px bg-surface-container-high mx-2"></div>

        {/* Kullanıcı Profili */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface">
              {loading ? "..." : (profile.full_name || "Kullanıcı")}
            </p>
            <p className="text-[10px] text-on-surface-variant">
              {loading ? "..." : (profile.company_name || "Şirket")}
            </p>
          </div>
          <img
            alt="Kullanıcı Profili"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20"
            src={profile.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBY5E2U5beAf0HPxnaZY_3SyyRPUzvnCyIBK8R7co4UYzbP8LSzDQTFYaWAjCrWObJ8b8an_PNCxkbdT39Lj-JVfjvS2Fj7hG2tLorvbgm8FWpmecUaQcfKyPK5RmWc4WQm22snPKPqESke94N3ANzD_ghrflBmp4Uu8JyNsOumn9J2tQOUOJ2K0ByOZChQ2-WhrXGeWwyNHxoNccGXrcTJE4Wab5TSUy3z3WoK2c_up-8q-jkCY5Xuf5Yw1dFITHkM_Zc-pJ04TlI"}
          />
        </div>
      </div>
    </header>
  );
}
