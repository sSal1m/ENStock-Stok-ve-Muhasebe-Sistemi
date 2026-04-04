"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cariEkleAction } from "./actions";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const TABS = ["Müşteriler", "Tedarikçiler", "Hepsi"] as const;
type Tab = (typeof TABS)[number];

interface CariHesap {
  id: number;
  type: "Müşteri" | "Tedarikçi";
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  // Not in DB directly, but we map them for UI
  kisaltma: string;
  bakiye: number; 
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Envanter", icon: "inventory_2", href: "/inventory" },
  { label: "Satışlar", icon: "receipt_long", href: "/invoices" },
  { label: "Giderler", icon: "payments", href: "#" },
  { label: "Cari (Rehber)", icon: "group", href: "/contacts", active: true },
  { label: "Raporlar", icon: "bar_chart", href: "/reports" },
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

const fmt = (val: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(val);

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function CariHesapSayfasi() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Hepsi");
  const [search, setSearch] = useState("");
  const [cariTuru, setCariTuru] = useState<"Müşteri" | "Tedarikçi">("Müşteri");
  const [cariData, setCariData] = useState<CariHesap[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ── Fetch from Supabase ──
  const fetchCariler = async () => {
    // ✅ Giriş yapan kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("Kullanıcı oturum açmamış");
      setLoading(false);
      return;
    }
    
    // ✅ SELECT sorgusuna .eq('user_id', user.id) filtreleme ekle
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)  // ✅ RLS policy 
      .order("id", { ascending: false });
    
    if (error) {
      console.error("Veri çekme hatası:", error);
    } else {
      const mappedData: CariHesap[] = (data || []).map((dbItem: any) => {
        const words = dbItem.name?.split(/\s+/) || [];
        const kisaltma =
          words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : dbItem.name?.slice(0, 2).toUpperCase() || "C";
            
        return {
          id: dbItem.id,
          type: dbItem.type === "supplier" ? "Tedarikçi" : "Müşteri",
          name: dbItem.name,
          email: dbItem.email,
          phone: dbItem.phone,
          address: dbItem.address,
          kisaltma,
          bakiye: 0 // Mock balance for now
        };
      });
      setCariData(mappedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCariler();
  }, []);

  const filtered = cariData.filter((c) => {
    const tabOk =
      activeTab === "Hepsi" ||
      (activeTab === "Müşteriler" && c.type === "Müşteri") ||
      (activeTab === "Tedarikçiler" && c.type === "Tedarikçi");
    const searchOk = c.name
      .toLocaleLowerCase("tr")
      .includes(search.toLocaleLowerCase("tr"));
    return tabOk && searchOk;
  });

  const alacak = cariData.filter((c) => c.bakiye > 0).reduce((s, c) => s + c.bakiye, 0);
  const borc = cariData.filter((c) => c.bakiye < 0).reduce((s, c) => s + Math.abs(c.bakiye), 0);
  const aktif = cariData.length;

  // ── Form Submit Handler ──
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tip", cariTuru);

    // ✅ Kullanıcıyı al ve FormData'ya ekle
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      fd.set("user_id", user.id);
    }

    startTransition(async () => {
      const result = await cariEkleAction(fd);
      setFormMsg({ ok: result.success, text: result.message });
      if (result.success) {
        formRef.current?.reset();
        setCariTuru("Müşteri");
        await fetchCariler(); // Refresh list
      }
      setTimeout(() => setFormMsg(null), 4000);
    });
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Head */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Cari Hesap Rehberi</h1>
              <p className="mt-1 text-sm text-slate-400">Müşteri ve tedarikçi hesaplarınızı tek panelden yönetin.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input
                  id="cari-search"
                  type="text"
                  placeholder="Cari ara…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-52 rounded-xl border border-indigo-100 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {/* Dışa Aktar */}
              <button
                id="btn-disa-aktar"
                className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">download</span>
                Dışa Aktar
              </button>
              {/* Yeni Cari */}
              <button
                id="btn-yeni-cari"
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-indigo-100 transition-all hover:bg-primary-container active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Yeni Cari Ekle
              </button>
            </div>
          </div>

          {/* ── STATS ── */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Alacak */}
            <div className="rounded-2xl border border-slate-100 bg-[#f2f3ff] px-6 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Toplam Alacak</p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-2xl font-extrabold text-emerald-600 tabular-nums leading-none">{fmt(alacak)}</p>
                <span className="mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-500">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                  +12.5%
                </span>
              </div>
            </div>

            {/* Borç */}
            <div className="rounded-2xl border border-slate-100 bg-[#f2f3ff] px-6 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Toplam Borç</p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-2xl font-extrabold text-[#ba1a1a] tabular-nums leading-none">{fmt(borc)}</p>
                <span className="mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#ba1a1a]">
                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                  -4.2%
                </span>
              </div>
            </div>

            {/* Aktif */}
            <div className="rounded-2xl border border-slate-100 bg-[#f2f3ff] px-6 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Aktif Hesap Sayısı</p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-2xl font-extrabold text-[#4b41e1] tabular-nums leading-none">{aktif}</p>
                <span className="mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#4b41e1]">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Tümü aktif
                </span>
              </div>
            </div>
          </section>

          {/* ── TABLE CARD ── */}
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-50/50">
            {/* Tabs — underline style */}
            <div className="flex items-center gap-6 border-b border-indigo-50 px-8 pt-5 bg-surface-container-low/30">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`relative pb-3.5 text-[13px] font-semibold transition-colors duration-200 ${
                    activeTab === tab
                      ? "text-[#4b41e1]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab}
                  {/* active underline */}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#4b41e1]" />
                  )}
                </button>
              ))}
              <span className="ml-auto pb-3.5 text-xs font-semibold text-slate-300">
                {filtered.length} kayıt
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50 text-left">
                    <th className="py-4 pl-8 pr-4 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                      Firma / Şahıs Adı
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                      Telefon
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                      E-posta
                    </th>
                    <th className="py-4 pl-4 pr-4 text-[11px] font-bold uppercase tracking-widest text-slate-300 text-right">
                      Bakiye
                    </th>
                    <th className="py-4 pr-8 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/contacts/${c.id}`)}
                      className="group cursor-pointer transition-colors duration-150 hover:bg-[#f2f3ff]/50"
                    >
                      {/* Firma */}
                      <td className="py-4 pl-8 pr-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide shadow-sm ${
                              c.type === "Müşteri"
                                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                                : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                            }`}
                          >
                            {c.kisaltma}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-snug">{c.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400 truncate w-32">{c.address || "Adres yok"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Telefon */}
                      <td className="px-4 py-4 text-slate-500">{c.phone || "—"}</td>

                      {/* E-posta */}
                      <td className="px-4 py-4 text-slate-400 text-[13px]">{c.email || "—"}</td>

                      {/* Bakiye — pill */}
                      <td className="py-4 pl-4 pr-4 text-right">
                        <span
                          className={`inline-block rounded-full px-4 py-1.5 text-xs font-bold tabular-nums ${
                            c.bakiye >= 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-[#ba1a1a]"
                          }`}
                        >
                          {c.bakiye >= 0 ? "+" : ""}
                          {fmt(c.bakiye)}
                        </span>
                      </td>

                      {/* More actions */}
                      <td className="py-4 pr-8 text-right">
                        <Link
                          href={`/contacts/${c.id}`}
                          title="Detaya Git"
                          onClick={(e) => e.stopPropagation()} // Prevent row click from firing duplicate event
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-[#4b41e1] hover:text-white"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-300">
                        <span className="material-symbols-outlined mb-3 block text-5xl">search_off</span>
                        <p className="text-sm font-semibold">Aramanızla eşleşen cari hesap bulunamadı.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── BENTO FORM ── */}
          <section className="bg-surface-container-low/30 rounded-2xl border border-indigo-50/50 p-8 shadow-sm">
            {/* Title */}
            <div className="mb-6 flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <span className="material-symbols-outlined text-[22px]">person_add</span>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Hızlı Yeni Cari Ekle</h2>
                <p className="text-xs text-slate-400">Formu doldurarak yeni müşteri veya tedarikçi ekleyin.</p>
              </div>
            </div>

            <form id="form-hizli-cari" ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-12 gap-5">
              {/* ─── Col 1: Tür + Firma Adı (span-4) ─── */}
              <div className="col-span-12 md:col-span-4 rounded-2xl bg-white p-5 border border-slate-100 space-y-4">
                {/* Cari Türü — toggle */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Cari Türü
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCariTuru("Müşteri")}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                        cariTuru === "Müşteri"
                          ? "bg-[#4b41e1] text-white shadow-md shadow-[#4b41e1]/20"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      Müşteri
                    </button>
                    <button
                      type="button"
                      onClick={() => setCariTuru("Tedarikçi")}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                        cariTuru === "Tedarikçi"
                          ? "bg-[#4b41e1] text-white shadow-md shadow-[#4b41e1]/20"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      Tedarikçi
                    </button>
                  </div>
                </div>
                {/* Firma/Şahıs Adı */}
                <div>
                  <label htmlFor="cari-unvan" className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Firma / Şahıs Adı</label>
                  <input id="cari-unvan" name="unvan" type="text" required placeholder="Şirket veya kişi adı" className="w-full rounded-xl border border-slate-200 bg-[#f8f9ff] px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-300 transition-all focus:border-[#4b41e1] focus:outline-none focus:ring-2 focus:ring-[#4b41e1]/20 focus:shadow-md" />
                </div>
              </div>

              {/* ─── Col 2: Vergi No + Vergi Dairesi + Telefon (span-4) ─── */}
              <div className="col-span-12 md:col-span-4 rounded-2xl bg-white p-5 border border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cari-vergi" className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Vergi Numarası</label>
                    <input id="cari-vergi" name="vergi_no" type="text" placeholder="123 456 7890" className="w-full rounded-xl border border-slate-200 bg-[#f8f9ff] px-3.5 py-2.5 font-mono text-sm text-slate-700 shadow-sm placeholder:font-sans placeholder:text-slate-300 transition-all focus:border-[#4b41e1] focus:outline-none focus:ring-2 focus:ring-[#4b41e1]/20 focus:shadow-md" />
                  </div>
                  <div>
                    <label htmlFor="cari-vd" className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Vergi Dairesi</label>
                    <input id="cari-vd" name="vergi_dairesi" type="text" placeholder="Kadıköy V.D." className="w-full rounded-xl border border-slate-200 bg-[#f8f9ff] px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-300 transition-all focus:border-[#4b41e1] focus:outline-none focus:ring-2 focus:ring-[#4b41e1]/20 focus:shadow-md" />
                  </div>
                </div>
                {/* Telefon */}
                <div>
                  <label htmlFor="cari-telefon" className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Telefon</label>
                  <input id="cari-telefon" name="telefon" type="tel" placeholder="0xxx xxx xx xx" className="w-full rounded-xl border border-slate-200 bg-[#f8f9ff] px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-300 transition-all focus:border-[#4b41e1] focus:outline-none focus:ring-2 focus:ring-[#4b41e1]/20 focus:shadow-md" />
                </div>
              </div>

              {/* ─── Col 3: Adres (textarea) + Kaydet (span-4) ─── */}
              <div className="col-span-12 md:col-span-4 rounded-2xl bg-white p-5 border border-slate-100 flex flex-col">
                <div className="flex-1">
                  <label htmlFor="cari-adres" className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Adres</label>
                  <textarea id="cari-adres" name="adres" rows={4} placeholder="Açık adres bilgisi girin..." className="w-full resize-none rounded-xl border border-slate-200 bg-[#f8f9ff] px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-300 transition-all focus:border-[#4b41e1] focus:outline-none focus:ring-2 focus:ring-[#4b41e1]/20 focus:shadow-md" />
                </div>
                {/* Kaydet button + status message */}
                <div className="mt-auto pt-6 flex items-center justify-between">
                  {formMsg && (
                    <p className={`text-sm font-semibold ${formMsg.ok ? "text-emerald-600" : "text-[#ba1a1a]"}`}>
                      {formMsg.ok ? "✓" : "✕"} {formMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    id="btn-kaydet"
                    disabled={isPending}
                    className="ml-auto flex items-center gap-2 rounded-full bg-[#4b41e1] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4b41e1]/25 transition-all duration-200 hover:bg-[#3d35c4] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">{isPending ? "hourglass_empty" : "save"}</span>
                    {isPending ? "Kaydediliyor..." : "Cariyi Kaydet"}
                  </button>
                </div>
              </div>
            </form>
          </section>
    </div>
  );
}
