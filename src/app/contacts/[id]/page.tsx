"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface CariRecord {
  id: number;
  type: "Müşteri" | "Tedarikçi";
  name: string;
  tax_number: string | null;
  tax_office: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  kisaltma: string;
  bakiye: number;
}

interface Islem {
  id: number;
  cari_id: number;
  tarih: string;
  fatura_no: string;
  islem_turu: string;
  tur_tipi: "satis" | "alis" | "odeme";
  toplam: number;
  durum: "Ödendi" | "Bekliyor" | "Gecikmiş";
}

/* ═══════════════════════════════════════════
   NAV & CONSTANTS
   ═══════════════════════════════════════════ */

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Envanter", icon: "inventory_2", href: "/inventory" },
  { label: "Satışlar", icon: "receipt_long", href: "/invoices" },
  { label: "Giderler", icon: "payments", href: "#" },
  { label: "Cari (Rehber)", icon: "group", href: "/contacts", active: true },
  { label: "Raporlar", icon: "analytics", href: "/reports" },
];

const TABS = ["Tüm İşlemler", "Satışlar", "Alışlar", "Ödemeler"] as const;
type Tab = (typeof TABS)[number];

/* ═══════════════════════════════════════════
   MOCK FALLBACK  — used only when the
   `islemler` table doesn't exist yet
   ═══════════════════════════════════════════ */

const MOCK_ISLEMLER: Islem[] = [
  { id: 1, cari_id: 0, tarih: "28 Haz 2024", fatura_no: "FTR-2024-0847", islem_turu: "Satış Faturası", tur_tipi: "satis", toplam: 34_250.0, durum: "Ödendi" },
  { id: 2, cari_id: 0, tarih: "25 Haz 2024", fatura_no: "FTR-2024-0831", islem_turu: "Alış Faturası", tur_tipi: "alis", toplam: 18_750.0, durum: "Bekliyor" },
  { id: 3, cari_id: 0, tarih: "20 Haz 2024", fatura_no: "FTR-2024-0812", islem_turu: "Satış Faturası", tur_tipi: "satis", toplam: 52_000.0, durum: "Gecikmiş" },
  { id: 4, cari_id: 0, tarih: "15 Haz 2024", fatura_no: "ODM-2024-0156", islem_turu: "Ödeme (Havale)", tur_tipi: "odeme", toplam: 45_000.0, durum: "Ödendi" },
  { id: 5, cari_id: 0, tarih: "10 Haz 2024", fatura_no: "FTR-2024-0789", islem_turu: "Alış Faturası", tur_tipi: "alis", toplam: 27_500.0, durum: "Ödendi" },
  { id: 6, cari_id: 0, tarih: "05 Haz 2024", fatura_no: "FTR-2024-0761", islem_turu: "Satış Faturası", tur_tipi: "satis", toplam: 41_800.0, durum: "Bekliyor" },
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const durumStyle = (d: Islem["durum"]) => {
  switch (d) {
    case "Ödendi":
      return "bg-[#f2f3ff] text-[#4b41e1]";
    case "Bekliyor":
      return "bg-indigo-50 text-indigo-500";
    case "Gecikmiş":
      return "bg-red-50 text-[#ba1a1a]";
  }
};

const turIcon = (t: Islem["tur_tipi"]) => {
  switch (t) {
    case "satis": return { icon: "arrow_upward", color: "text-emerald-500" };
    case "alis": return { icon: "arrow_downward", color: "text-[#ba1a1a]" };
    case "odeme": return { icon: "swap_horiz", color: "text-[#4b41e1]" };
  }
};

const tabKategori = (t: Islem["tur_tipi"]): "Satışlar" | "Alışlar" | "Ödemeler" => {
  switch (t) {
    case "satis": return "Satışlar";
    case "alis": return "Alışlar";
    case "odeme": return "Ödemeler";
  }
};

const avatarGradient = (tip: string) =>
  tip === "Tedarikçi"
    ? "from-amber-400 to-orange-500 shadow-orange-300/30"
    : "from-emerald-400 to-emerald-600 shadow-emerald-300/30";

const badgeStyle = (tip: string) =>
  tip === "Tedarikçi"
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function CariDetaySayfasi() {
  const params = useParams();
  const cariId = params.id as string;

  const [cari, setCari] = useState<CariRecord | null>(null);
  const [islemler, setIslemler] = useState<Islem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Tüm İşlemler");

  // ── Fetch cari record ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. Fetch the cari record
      const { data: dbData, error: cariError } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", cariId)
        .single();

      if (cariError || !dbData) {
        console.error("Cari bulunamadı:", cariError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const words = dbData.name?.split(/\s+/) || [];
      const kisaltma = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : dbData.name?.slice(0, 2).toUpperCase() || "C";

      const cariData = {
        ...dbData,
        type: dbData.type === "supplier" ? "Tedarikçi" : "Müşteri",
        kisaltma,
        bakiye: 0 // Mock balance
      };
      
      setCari(cariData as CariRecord);

      // 2. Try to fetch transactions
      const { data: islemData, error: islemError } = await supabase
        .from("islemler")
        .select("*")
        .eq("cari_id", cariId)
        .order("tarih", { ascending: false });

      if (islemError) {
        // Table might not exist yet — use mock data
        console.warn("İşlemler tablosu bulunamadı, örnek veri kullanılıyor:", islemError.message);
        setIslemler(MOCK_ISLEMLER.map((i) => ({ ...i, cari_id: Number(cariId) })));
      } else {
        setIslemler((islemData as Islem[]) || []);
      }

      setLoading(false);
    };

    if (cariId) fetchData();
  }, [cariId]);

  // ── Derived ──
  const filtered =
    activeTab === "Tüm İşlemler"
      ? islemler
      : islemler.filter((i) => tabKategori(i.tur_tipi) === activeTab);

  const bakiye = cari?.bakiye ?? 0;
  const isBorclu = bakiye < 0;
  const bakiyeLabel = isBorclu ? "Güncel Borç" : "Güncel Alacak";
  const bakiyeColor = isBorclu ? "text-[#ba1a1a]" : "text-emerald-600";
  const bakiyeBg = isBorclu ? "bg-red-50/60 border-red-100" : "bg-emerald-50/60 border-emerald-100";

  // ── Breakdown calculations ──
  const bekleyen = islemler.filter((i) => i.durum === "Bekliyor").reduce((s, i) => s + i.toplam, 0);
  const gecikmis = islemler.filter((i) => i.durum === "Gecikmiş").reduce((s, i) => s + i.toplam, 0);
  const odenen = islemler.filter((i) => i.durum === "Ödendi").reduce((s, i) => s + i.toplam, 0);

  /* ═══════════════════════════════════════════
     LOADING STATE
     ═══════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="p-6 lg:p-10 space-y-8">
        <div className="mx-auto max-w-7xl space-y-7">
              {/* Skeleton header */}
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                <span>Cariler</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-300">Yükleniyor…</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-7 w-64 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="h-4 w-40 rounded-md bg-slate-100 animate-pulse" />
                </div>
              </div>
              {/* Skeleton cards */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2 h-64 rounded-2xl bg-white border border-slate-100 animate-pulse" />
                <div className="h-64 rounded-2xl bg-white border border-slate-100 animate-pulse" />
              </div>
              <div className="h-80 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     NOT FOUND STATE
     ═══════════════════════════════════════════ */
  if (notFound || !cari) {
    return (
      <div className="p-6 lg:p-10 space-y-8">
        <div className="mx-auto max-w-7xl">
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 mb-6">
                  <span className="material-symbols-outlined text-slate-300 text-[40px]">person_off</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Cari Bulunamadı</h2>
                <p className="text-sm text-slate-400 mb-6">ID #{cariId} ile eşleşen bir cari hesap kaydı bulunamadı.</p>
                <Link href="/contacts" className="flex items-center gap-2 rounded-full bg-[#4b41e1] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4b41e1]/25 hover:bg-[#3d35c4] transition-all">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Cari Rehberine Dön
                </Link>
              </div>
            </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="p-6 lg:p-10 space-y-8">
          <div className="mx-auto max-w-7xl space-y-7">

            {/* ── TOP NAV OPTIONS (BREADCRUMBS & BACK BUTTON) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Link href="/contacts" className="inline-flex w-fit items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-[13px] font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-primary hover:border-primary/30">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Rehbere Geri Dön
              </Link>
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                <Link href="/contacts" className="hover:text-primary transition-colors">Cariler</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-600">Detay</span>
              </div>
            </div>

            {/* ── PAGE HEADER (DYNAMIC) ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(cari.type)} text-white text-lg font-bold shadow-lg`}>
                  {cari.kisaltma}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{cari.name}</h1>
                    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold ${badgeStyle(cari.type)}`}>
                      {cari.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {cari.tax_number ? `VKN: ${cari.tax_number}` : "VKN: —"} · {cari.address ? "Adres Kayıtlı" : "Türkiye"}
                  </p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 active:scale-[0.97] transition-all">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Düzenle
                </button>
                <button className="flex items-center gap-2 rounded-full border-2 border-[#4b41e1] px-4 py-2.5 text-sm font-semibold text-[#4b41e1] hover:bg-[#4b41e1]/5 active:scale-[0.97] transition-all">
                  <span className="material-symbols-outlined text-[18px]">receipt</span>
                  Yeni Fatura Kes
                </button>
                <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4b41e1] to-[#645efb] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4b41e1]/30 hover:shadow-xl hover:shadow-[#4b41e1]/40 active:scale-[0.97] transition-all">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  Ödeme Al
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════
               BENTO GRID — Info + Balance
               ══════════════════════════════════════ */}
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">

              {/* ─ Cari Bilgiler (col-span-2) ─ */}
              <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-[#4b41e1] text-[20px]">badge</span>
                  <h3 className="text-[15px] font-bold text-slate-800">Cari Bilgileri</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Phone */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                      <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Telefon</p>
                      <p className="mt-0.5 text-[14px] font-bold text-slate-700">{cari.phone || "—"}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                      <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">E-posta</p>
                      <p className="mt-0.5 text-[14px] font-bold text-slate-700">{cari.email || "—"}</p>
                    </div>
                  </div>

                  {/* Tax Office */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                      <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vergi Dairesi / No</p>
                      <p className="mt-0.5 text-[14px] font-bold text-slate-700">
                        {cari.tax_office || "—"} / {cari.tax_number || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Maturity */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                      <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vade Tercihi</p>
                      <p className="mt-0.5 text-[14px] font-bold text-slate-700">30 Gün</p>
                    </div>
                  </div>
                </div>

                {/* Address sub-card */}
                <div className="mt-5 rounded-xl bg-[#f8f9ff] border border-slate-200/60 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4b41e1]/10 mt-0.5">
                      <span className="material-symbols-outlined text-[#4b41e1] text-[18px]">location_on</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Adres Detayı</p>
                      <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
                        {cari.address || "Adres bilgisi girilmemiş."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─ Bakiye Özeti (col-span-1) ─ DYNAMIC */}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <span className={`material-symbols-outlined text-[20px] ${isBorclu ? "text-[#ba1a1a]" : "text-emerald-500"}`}>account_balance_wallet</span>
                  <h3 className="text-[15px] font-bold text-slate-800">Bakiye Özeti</h3>
                </div>

                {/* Balance */}
                <div className={`rounded-xl border p-5 text-center mb-5 ${bakiyeBg}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{bakiyeLabel}</p>
                  <p className={`text-3xl font-extrabold tabular-nums ${bakiyeColor}`}>₺{fmt(Math.abs(bakiye))}</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-[18px]">pending</span>
                      <span className="text-[12px] font-semibold text-slate-600">Bekleyen</span>
                    </div>
                    <span className="text-[13px] font-bold text-amber-700 tabular-nums">₺{fmt(bekleyen)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-red-50/60 border border-red-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">warning</span>
                      <span className="text-[12px] font-semibold text-slate-600">Gecikmiş</span>
                    </div>
                    <span className="text-[13px] font-bold text-[#ba1a1a] tabular-nums">₺{fmt(gecikmis)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 border border-emerald-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                      <span className="text-[12px] font-semibold text-slate-600">Ödenen (Bu Ay)</span>
                    </div>
                    <span className="text-[13px] font-bold text-emerald-600 tabular-nums">₺{fmt(odenen)}</span>
                  </div>
                </div>

                {/* CTA */}
                <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ba1a1a] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#ba1a1a]/25 hover:bg-[#a01515] hover:shadow-xl hover:shadow-[#ba1a1a]/35 active:scale-[0.98] transition-all">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                  Ödeme Yap
                </button>
              </div>
            </section>

            {/* ══════════════════════════════════════
               TRANSACTION HISTORY (DYNAMIC)
               ══════════════════════════════════════ */}
            <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              {/* Header + tabs */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 pt-5 pb-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4b41e1] text-[20px]">history</span>
                  <h3 className="text-[15px] font-bold text-slate-800">İşlem Geçmişi</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-300">{filtered.length} kayıt</span>
              </div>

              {/* Tabs — underline */}
              <div className="flex items-center gap-6 px-6 pt-3 border-b border-slate-100">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative pb-3.5 text-[13px] font-semibold transition-colors duration-200 ${
                      activeTab === tab ? "text-[#4b41e1]" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#4b41e1]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50 text-left">
                      <th className="py-4 pl-6 pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">Tarih</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">Fatura No</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">İşlem Türü</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-300 text-right">Toplam Tutar</th>
                      <th className="py-4 pl-4 pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-300 text-center">Durum</th>
                      <th className="py-4 pr-6 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/80">
                    {filtered.map((tx) => {
                      const { icon, color } = turIcon(tx.tur_tipi);
                      return (
                        <tr key={tx.id} className="group transition-colors duration-150 hover:bg-[#f2f3ff]/30">
                          {/* Tarih */}
                          <td className="py-4 pl-6 pr-4 text-slate-500 font-medium whitespace-nowrap">{tx.tarih}</td>

                          {/* Fatura No — mono badge */}
                          <td className="px-4 py-4">
                            <span className="inline-block rounded-lg bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1 font-mono text-[12px] font-bold text-[#4b41e1]">
                              {tx.fatura_no}
                            </span>
                          </td>

                          {/* İşlem Türü */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
                              <span className="text-slate-700 font-medium">{tx.islem_turu}</span>
                            </div>
                          </td>

                          {/* Tutar */}
                          <td className="px-4 py-4 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                            {tx.tur_tipi === "alis" ? "-" : ""}₺{fmt(tx.toplam)}
                          </td>

                          {/* Durum — pill */}
                          <td className="py-4 pl-4 pr-4 text-center">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${durumStyle(tx.durum)}`}>
                              {tx.durum}
                            </span>
                          </td>

                          {/* More */}
                          <td className="py-4 pr-6">
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-all duration-150 hover:bg-slate-100 hover:text-slate-600">
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-300">
                          <span className="material-symbols-outlined mb-3 block text-5xl">search_off</span>
                          <p className="text-sm font-semibold">Bu kategoride işlem bulunamadı.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
    </div>
  );
}
