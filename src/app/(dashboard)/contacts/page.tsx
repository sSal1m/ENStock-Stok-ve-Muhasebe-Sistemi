"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cariEkleAction } from "./actions";
import { softDeleteContact } from "@/app/(dashboard)/trash/actions";
import toast from "react-hot-toast";
import Link from "next/link";
import * as XLSX from "xlsx";
import { resolveTeamIds, applyTeamFilter } from "@/lib/teamUtils";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const TABS = ["Müşteriler", "Tedarikçiler", "Hepsi"] as const;
type Tab = (typeof TABS)[number];

interface Contact {
  id: string;
  type: "customer" | "supplier";
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  current_balance: number;
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

const fmt = (val: number, currency: string = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(val);

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Hepsi");
  const [search, setSearch] = useState("");
  const [cariTuru, setCariTuru] = useState<"Müşteri" | "Tedarikçi">("Müşteri");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Döviz Durumu
  const [viewCurrency, setViewCurrency] = useState("TRY");
  const [rates, setRates] = useState<any>(null);

  // ── Döviz Kurlarını Çek ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch("/api/currency");
        const data = await res.json();
        if (data.rates) {
          setRates(data.rates);
        }
      } catch (err) {
        console.error("Kurlar yüklenemedi:", err);
      }
    }
    fetchRates();
  }, []);

  // ── Fetch from Supabase ──
  const fetchContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("Kullanıcı oturum açmamış");
      setLoading(false);
      return;
    }

    // Resolve team context
    const teamIds = await resolveTeamIds(user.id);
    
    const { data, error } = await applyTeamFilter(
      supabase.from("contacts").select("*").is("deleted_at", null),
      teamIds
    ).order("created_at", { ascending: false });
    
    if (error) {
      console.error("Veri çekme hatası:", error);
    } else {
      setContacts((data as Contact[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const filtered = contacts.filter((c) => {
    const tabOk =
      activeTab === "Hepsi" ||
      (activeTab === "Müşteriler" && c.type === "customer") ||
      (activeTab === "Tedarikçiler" && c.type === "supplier");
    const searchOk = c.name
      .toLocaleLowerCase("tr")
      .includes(search.toLocaleLowerCase("tr"));
    return tabOk && searchOk;
  });

  const convert = (val: number) => {
    if (viewCurrency === "TRY" || !rates) return val;
    const rate = rates[viewCurrency]?.selling || 1;
    return val / rate;
  };

  const alacak = contacts.filter((c) => c.current_balance > 0).reduce((s, c) => s + c.current_balance, 0);
  const borc = contacts.filter((c) => c.current_balance < 0).reduce((s, c) => s + Math.abs(c.current_balance), 0);
  const aktif = contacts.length;

  const totalVolume = alacak + borc;
  const alacakPercent = totalVolume === 0 ? 0 : Math.round((alacak / totalVolume) * 100);
  const borcPercent = totalVolume === 0 ? 0 : Math.round((borc / totalVolume) * 100);

  // ── Form Submit Handler ──
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tip", cariTuru);

    startTransition(async () => {
      // ✅ Get current user before submission
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Oturum açma gerekli. Lütfen giriş yapın.");
        return;
      }
      fd.set("user_id", user.id);

      const result = await cariEkleAction(fd);
      
      if (result.success) {
        // ✅ Başarı durumu: Toast göster + state güncelle + form temizle
        toast.success(result.message);
        
        // Yeni cariyi state'e ekle (sayfa yenilemeden)
        if (result.data) {
          setContacts((prev) => [result.data as Contact, ...prev]);
        }
        
        // Formu temizle
        formRef.current?.reset();
        setCariTuru("Müşteri");
      } else {
        // ❌ Hata durumu: Toast göster
        toast.error(result.message);
      }
    });
  };

  // ── Excel Export Handler ──
  const handleExportXlsx = () => {
    if (filtered.length === 0) {
      toast.error("Dışa aktarılacak kayıt bulunmuyor.");
      return;
    }

    // Format data for excel
    const exportData = filtered.map((c) => ({
      "Cari Türü": c.type === "customer" ? "Müşteri" : "Tedarikçi",
      "Firma / Şahıs Adı": c.name,
      "E-posta": c.email || "Belirtilmemiş",
      "Telefon": c.phone || "Belirtilmemiş",
      "Adres": c.address || "Belirtilmemiş",
      "Bakiye": c.current_balance,
      "Görünen Bakiye": fmt(convert(c.current_balance), viewCurrency)
    }));

    // Create Worksheet & Workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cariler");

    // Download
    XLSX.writeFile(workbook, `Cariler_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel dosyası başarıyla indirildi.");
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* ── Sayfa Başlığı ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
            <span>Panel</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-slate-500">Cari Hesap Yönetimi</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            Cari Hesap Rehberi
          </h1>
          <p className="text-slate-500 mt-1">
            Müşteri ve tedarikçi hesaplarınızı tek panelden yönetin.
          </p>
        </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-indigo-100 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Görünüm:</span>
              <select
                value={viewCurrency}
                onChange={(e) => setViewCurrency(e.target.value)}
                className="bg-transparent border-none text-sm font-black text-primary outline-none focus:ring-0 cursor-pointer"
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              id="cari-search"
              type="text"
              placeholder="Cari ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 rounded-xl border border-indigo-100 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <button
            onClick={handleExportXlsx}
            className="border border-indigo-100 text-slate-600 px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Dışa Aktar</span>
          </button>
          <button
            onClick={() => document.getElementById('form-hizli-cari')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-primary-container transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Yeni Cari Ekle</span>
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Alacak */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Alacak</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-emerald-600 tabular-nums leading-none">{fmt(convert(alacak), viewCurrency)}</p>
            <span className="mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-500">
              <span className="material-symbols-outlined text-[14px]">pie_chart</span>
              %{alacakPercent}
            </span>
          </div>
        </div>

        {/* Borç */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Borç</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-error tabular-nums leading-none">{fmt(convert(borc), viewCurrency)}</p>
            <span className="mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-error">
              <span className="material-symbols-outlined text-[14px]">pie_chart</span>
              %{borcPercent}
            </span>
          </div>
        </div>

        {/* Aktif */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Aktif Hesaplar</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-primary tabular-nums leading-none">{aktif}</p>
            <span className="mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              Tümü aktif
            </span>
          </div>
        </div>
      </section>

      {/* ── TABLE CARD ── */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-50/50">
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-indigo-50 px-8 pt-5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3.5 text-sm font-bold transition-all ${
                activeTab === tab
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-primary" />
              )}
            </button>
          ))}
          <span className="ml-auto pb-3.5 text-xs font-bold text-slate-300">
            {filtered.length} kayıt bulundu
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Firma / Şahıs Adı
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  İletişim
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                  Bakiye
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {loading ? (
                <tr>
                   <td colSpan={4} className="px-8 py-10 text-center animate-pulse text-slate-400">Yükleniyor...</td>
                </tr>
              ) : filtered.map((c) => (
                <tr
                  key={c.id}
                  className="group hover:bg-indigo-50/20 transition-colors"
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white shadow-sm ${
                          c.type === "customer"
                            ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                            : "bg-gradient-to-br from-amber-400 to-orange-500"
                        }`}
                      >
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/contacts/${c.id}`} className="font-bold text-on-surface hover:text-primary transition-colors">
                          {c.name}
                        </Link>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          {c.type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-600">{c.phone || "—"}</p>
                    <p className="text-xs text-slate-400">{c.email || "—"}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span
                      className={`inline-block rounded-lg px-3 py-1 text-xs font-black tabular-nums ${
                        c.current_balance >= 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-error-container/20 text-error"
                      }`}
                    >
                      {fmt(convert(c.current_balance), viewCurrency)}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/contacts/${c.id}`} className="p-2 text-primary hover:bg-indigo-50 rounded-lg">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </Link>
                      <button
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) { toast.error("Oturum açma gerekli."); return; }
                          const result = await softDeleteContact(c.id, user.id);
                          if (result.success) {
                            toast.success(`"${c.name}" çöp kutusuna taşındı.`, { icon: "🗑️" });
                            setContacts(prev => prev.filter(x => x.id !== c.id));
                          } else {
                            toast.error(result.message);
                          }
                        }}
                        className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"
                        title="Çöp Kutusuna Taşı"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center">
                    <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 block">search_off</span>
                    <p className="text-slate-400 font-bold">Kayıt bulunamadı</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── BENTO FORM ── */}
      <section id="form-hizli-cari" className="bg-white rounded-3xl border border-indigo-50/50 p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <span className="material-symbols-outlined text-primary text-2xl">person_add</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-on-surface">Hızlı Yeni Cari Ekle</h2>
            <p className="text-sm text-slate-500">Müşteri veya tedarikçi bilgilerini sisteme kaydedin.</p>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4 bg-slate-50/50 rounded-2xl p-6 border border-indigo-50/50 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Cari Türü</label>
              <div className="flex gap-2 p-1 bg-white rounded-xl border border-indigo-100">
                <button
                  type="button"
                  onClick={() => setCariTuru("Müşteri")}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                    cariTuru === "Müşteri" ? "bg-primary text-on-primary shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >Müşteri</button>
                <button
                  type="button"
                  onClick={() => setCariTuru("Tedarikçi")}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                    cariTuru === "Tedarikçi" ? "bg-primary text-on-primary shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >Tedarikçi</button>
              </div>
            </div>
            <div>
              <label htmlFor="cari-unvan" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Firma / Şahıs Adı</label>
              <input id="cari-unvan" name="unvan" type="text" required placeholder="Şirket veya kişi adı" className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-slate-50/50 rounded-2xl p-6 border border-indigo-50/50 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cari-vergi" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Vergi No</label>
                <input id="cari-vergi" name="vergi_no" type="text" placeholder="1234567890" className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div>
                <label htmlFor="cari-vd" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Vergi Dairesi</label>
                <input id="cari-vd" name="vergi_dairesi" type="text" placeholder="Kadıköy V.D." className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary transition-all" />
              </div>
            </div>
            <div>
              <label htmlFor="cari-email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">E-posta</label>
              <input id="cari-email" name="email" type="email" placeholder="ornek@sirket.com" className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-slate-50/50 rounded-2xl p-6 border border-indigo-50/50 flex flex-col">
            <div className="flex-1 space-y-4">
              <div>
                <label htmlFor="cari-telefon" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Telefon</label>
                <input id="cari-telefon" name="telefon" type="tel" placeholder="05XX XXX XX XX" className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div>
                <label htmlFor="cari-adres" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">Adres</label>
                <textarea id="cari-adres" name="adres" rows={2} placeholder="Açık adres bilgisi..." className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-primary transition-all" />
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <button
                type="submit"
                disabled={isPending}
                className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-black text-on-primary shadow-lg shadow-indigo-100 hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">{isPending ? "sync" : "save"}</span>
                {isPending ? "Kaydediliyor..." : "Cariyi Kaydet"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <footer className="pt-8 text-center border-t border-indigo-50/50">
        <p className="text-slate-400 text-xs font-bold">
          © 2026 KOBİ Hesap Sistemi · Version 2.4.0
        </p>
      </footer>
    </div>
  );
}
