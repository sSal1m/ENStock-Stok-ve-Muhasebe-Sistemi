"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserProfile {
  full_name: string | null;
  company_name: string | null;
}

export default function Navbar() {
  const [profile, setProfile] = useState<UserProfile>({
    full_name: null,
    company_name: null,
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

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setProfile({
          full_name: data.full_name || "Kullanıcı",
          company_name: data.company_name || "Şirket",
        });
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white shadow-sm flex justify-between items-center px-6 text-sm font-medium border-b border-indigo-50/10">
      {/* Sol: Mobil Logo & Hızlı Bağlantılar */}
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold text-indigo-700 md:hidden">KOBİ Muhasebe</span>
        <div className="hidden md:flex items-center gap-6">
          <a className="text-slate-500 hover:text-indigo-600 transition-colors" href="#">
            Hızlı İşlemler
          </a>
          <a className="text-slate-500 hover:text-indigo-600 transition-colors" href="#">
            Raporlar
          </a>
        </div>
      </div>

      {/* Sağ: Arama, Bildirimler, Kullanıcı */}
      <div className="flex items-center gap-4">
        {/* Arama Kutusu */}
        <div className="hidden sm:flex items-center bg-surface-container-low px-3 py-1.5 rounded-lg border border-indigo-50">
          <span className="material-symbols-outlined text-slate-400 text-lg mr-2">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-48 text-on-surface outline-none"
            placeholder="Ürün, fatura veya cari ara..."
            type="text"
          />
        </div>

        {/* Bildirim & Ayarlar */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors active:scale-95 duration-200">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors active:scale-95 duration-200">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2"></div>

        {/* Kullanıcı Profili */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-indigo-900">
              {loading ? "..." : (profile.full_name || "Kullanıcı")}
            </p>
            <p className="text-[10px] text-slate-500">
              {loading ? "..." : (profile.company_name || "Şirket")}
            </p>
          </div>
          <img
            alt="Kullanıcı Profili"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-50"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLwU-09acbj8d4HokWs5QBfxqEikAjQ7Jbs_CRZNUgHZsAQg3lBoV-ZR-gkWfshJZA_DwxLPBPe6vz_G_YEojA4Ba9MSMIiJHrhNZs0_T9bmjF1hrYsZcDkkYfK36uOlTqyK7Wu-zCE0X6ZfJCZy_x-JVEUpvhG2LdmB0vloglG6-FSF2TjRUSXale4kqtswU2hlKQS52YEfy1zXELXDBWJH-JprDflmojJN36u7gLbGMXdCj1950R9AEmsm7TdinknEKd4CxMQrE"
          />
        </div>
      </div>
    </header>
  );
}
