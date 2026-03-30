"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cariEkleAction } from "./actions";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const TABS = ["Müşteriler", "Tedarikçiler", "Hepsi"] as const;
type Tab = (typeof TABS)[number];

interface CariHesap {
  id: number;
  tip: "Müşteri" | "Tedarikçi";
  unvan: string;
  kisaltma: string;
  eposta: string | null;
  telefon: string | null;
  sehir: string | null;
  bakiye: number;
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Envanter", icon: "inventory_2", href: "/inventory" },
  { label: "Satışlar", icon: "receipt_long", href: "/invoices" },
  { label: "Giderler", icon: "payments", href: "#" },
  { label: "Cari (Rehber)", icon: "group", href: "/cari-hesap-yonetimi", active: true },
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
    const { data, error } = await supabase.from("cariler").select("*").order("id", { ascending: false });
    if (error) {
      console.error("Veri çekme hatası:", error);
    } else {
      setCariData((data as CariHesap[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCariler();
  }, []);

  const filtered = cariData.filter((c) => {
    const tabOk =
      activeTab === "Hepsi" ||
      (activeTab === "Müşteriler" && c.tip === "Müşteri") ||
      (activeTab === "Tedarikçiler" && c.tip === "Tedarikçi");
    const searchOk = c.unvan
      .toLocaleLowerCase("tr")
      .includes(search.toLocaleLowerCase("tr"));
    return tabOk && searchOk;
  });

  const alacak = cariData.filter((c) => c.bakiye > 0).reduce((s, c) => s + c.bakiye, 0);
  const borc = cariData.filter((c) => c.bakiye < 0).reduce((s, c) => s + Math.abs(c.bakiye), 0);
  const aktif = cariData.length;

  // ── Form Submit Handler ──
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tip", cariTuru);

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
    <div className="flex min-h-screen font-[Manrope,sans-serif]">
      {/* ╔══════════════════════════════════════╗
          ║  SIDEBAR                             ║
          ╚══════════════════════════════════════╝ */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#f1f5f9] border-r border-slate-200/60 md:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 pt-7 pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4b41e1] shadow-lg shadow-[#4b41e1]/30">
            <span
              className="material-symbols-outlined text-white text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance
            </span>
          </div>
          <div>
            <h2 className="text-[15px] font-extrabold leading-tight text-slate-800">
              Sovereign Ledger
            </h2>
            <p className="text-[11px] font-medium text-slate-400">Yönetici Paneli</p>
          </div>
        </div>

        <div className="mx-5 h-px bg-slate-200/80" />

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 pt-5">
          {NAV_ITEMS.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all duration-200 ${
                n.active
                  ? "bg-[#4b41e1] text-white shadow-md shadow-[#4b41e1]/25"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={n.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {n.icon}
              </span>
              {n.label}
            </a>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-4 pb-5 space-y-1">
          <div className="mx-1 mb-3 h-px bg-slate-200/80" />
          <a href="#" className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-500 hover:bg-white/60 transition-all">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Ayarlar
          </a>
          <a href="#" className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-500 hover:bg-white/60 hover:text-red-600 transition-all">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Çıkış Yap
          </a>
        </div>
      </aside>

      {/* ╔══════════════════════════════════════╗
          ║  MAIN                                ║
          ╚══════════════════════════════════════╝ */}
      <div className="flex flex-1 flex-col md:ml-64 min-h-screen bg-[#faf8ff]">
        {/* ── TOP BAR ── */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/50 bg-white/70 backdrop-blur-xl backdrop-saturate-150 px-8 py-3.5">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input
              id="global-search"
              type="text"
              placeholder="Hızlı ara..."
              className="w-72 rounded-full border border-slate-200 bg-[#f8f9ff] py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4b41e1] focus:outline-none focus:ring-2 focus:ring-[#4b41e1]/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-500 text-[22px]">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#4b41e1] to-[#7c6cf0] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-[#4b41e1]/20">AY</div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">Ahmet Yılmaz</p>
                <p className="text-[11px] font-medium text-slate-400">Yönetici</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="flex-1 px-8 py-10">
          <div className="mx-auto max-w-7xl space-y-8">
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
                  className="w-52 rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4b41e1] focus:outline-none focus:ring-2 focus:ring-[#4b41e1]/20 transition-all"
                />
              </div>
              {/* Dışa Aktar */}
              <button
                id="btn-disa-aktar"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.97]"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">download</span>
                Dışa Aktar
              </button>
              {/* Yeni Cari */}
              <button
                id="btn-yeni-cari"
                className="flex items-center gap-2 rounded-full bg-[#4b41e1] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#4b41e1]/25 transition-all hover:bg-[#3d35c4] active:scale-[0.97]"
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
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            {/* Tabs — underline style */}
            <div className="flex items-center gap-6 border-b border-slate-100 px-8 pt-5">
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
                      className="group transition-colors duration-150 hover:bg-[#f2f3ff]/30"
                    >
                      {/* Firma */}
                      <td className="py-4 pl-8 pr-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide shadow-sm ${
                              c.tip === "Müşteri"
                                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                                : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                            }`}
                          >
                            {c.kisaltma}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-snug">{c.unvan}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{c.sehir}</p>
                          </div>
                        </div>
                      </td>

                      {/* Telefon */}
                      <td className="px-4 py-4 text-slate-500">{c.telefon || "—"}</td>

                      {/* E-posta */}
                      <td className="px-4 py-4 text-slate-400 text-[13px]">{c.eposta || "—"}</td>

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
                      <td className="py-4 pr-8">
                        <button
                          title="Diğer işlemler"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
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
          <section className="rounded-3xl bg-[#f2f3ff]/60 border border-slate-200/50 p-8">
            {/* Title */}
            <div className="mb-6 flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4b41e1]/10">
                <span className="material-symbols-outlined text-[#4b41e1] text-[22px]">person_add</span>
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
        </main>
      </div>
    </div>
  );
}
