"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface Islem {
  id: number;
  tarih: string;
  fatura_no: string;
  islem_turu: string;
  tur_tipi: "satis" | "alis" | "odeme" | "gelir" | "gider";
  toplam: number;
  durum: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Envanter", icon: "inventory_2", href: "/inventory" },
  { label: "Satışlar", icon: "receipt_long", href: "/invoices" },
  { label: "Giderler", icon: "payments", href: "#" },
  { label: "Cari (Rehber)", icon: "group", href: "/cari-hesap-yonetimi" },
  { label: "Raporlar", icon: "analytics", href: "/raporlar", active: true },
];

/* ═══════════════════════════════════════════
   MOCK FALLBACK
   ═══════════════════════════════════════════ */

const MOCK_ISLEMLER: Islem[] = [
  { id: 1, tarih: "2024-01-15T10:00:00Z", fatura_no: "F-01", islem_turu: "Hizmet Gelirleri", tur_tipi: "satis", toplam: 58000, durum: "Ödendi" },
  { id: 2, tarih: "2024-02-15T10:00:00Z", fatura_no: "F-02", islem_turu: "Ürün Satışları", tur_tipi: "satis", toplam: 46000, durum: "Ödendi" },
  { id: 3, tarih: "2024-03-15T10:00:00Z", fatura_no: "F-03", islem_turu: "Danışmanlık", tur_tipi: "satis", toplam: 72000, durum: "Ödendi" },
  { id: 4, tarih: "2024-04-15T10:00:00Z", fatura_no: "F-04", islem_turu: "Hizmet Gelirleri", tur_tipi: "satis", toplam: 64000, durum: "Ödendi" },
  { id: 5, tarih: "2024-05-15T10:00:00Z", fatura_no: "F-05", islem_turu: "Diğer Gelirler", tur_tipi: "satis", toplam: 80000, durum: "Ödendi" },
  { id: 6, tarih: "2024-06-15T10:00:00Z", fatura_no: "F-06", islem_turu: "Hizmet Gelirleri", tur_tipi: "satis", toplam: 130000, durum: "Ödendi" },
  { id: 7, tarih: "2024-06-10T10:00:00Z", fatura_no: "G-01", islem_turu: "Personel Giderleri", tur_tipi: "alis", toplam: 155000, durum: "Ödendi" },
  { id: 8, tarih: "2024-06-12T10:00:00Z", fatura_no: "G-02", islem_turu: "Kira & Ofis", tur_tipi: "alis", toplam: 62000, durum: "Ödendi" },
  { id: 9, tarih: "2024-06-20T10:00:00Z", fatura_no: "G-03", islem_turu: "Malzeme", tur_tipi: "alis", toplam: 46500, durum: "Ödendi" },
  { id: 10, tarih: "2024-06-22T10:00:00Z", fatura_no: "G-04", islem_turu: "Pazarlama", tur_tipi: "alis", toplam: 31000, durum: "Ödendi" },
  { id: 11, tarih: "2024-06-25T10:00:00Z", fatura_no: "G-05", islem_turu: "Diğer", tur_tipi: "alis", toplam: 15500, durum: "Ödendi" },
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const PIE_COLORS = [
  { bg: "bg-[#4b41e1]", hex: "#4b41e1" },
  { bg: "bg-emerald-500", hex: "#10b981" },
  { bg: "bg-amber-400", hex: "#f59e0b" },
  { bg: "bg-slate-400", hex: "#94a3b8" },
  { bg: "bg-rose-400", hex: "#fb7185" },
];

/* ═══════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════ */

export default function RaporlarSayfasi() {
  const [islemler, setIslemler] = useState<Islem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date range label (could be dynamic, but static for now to match UI design text)
  const [dateRange] = useState("01 Oca 2024 – 30 Haz 2024");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("islemler").select("*");

      if (error) {
        console.warn("İşlemler tablosu bulunamadı, mock veriler kullanılıyor:", error.message);
        setIslemler(MOCK_ISLEMLER);
      } else {
        setIslemler((data as Islem[]) || []);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // 1. GLOBAL AGGREGATIONS
  let toplamGelir = 0;
  let toplamGider = 0;

  const gelirKategorileri = new Map<string, number>();
  const giderKategorileri = new Map<string, number>();

  // Process all records
  islemler.forEach((tx) => {
    const isGelir = tx.tur_tipi === "satis" || tx.tur_tipi === "gelir";
    const isGider = tx.tur_tipi === "alis" || tx.tur_tipi === "gider";

    if (isGelir) {
      toplamGelir += tx.toplam;
      gelirKategorileri.set(tx.islem_turu, (gelirKategorileri.get(tx.islem_turu) || 0) + tx.toplam);
    } else if (isGider) {
      toplamGider += tx.toplam;
      giderKategorileri.set(tx.islem_turu, (giderKategorileri.get(tx.islem_turu) || 0) + tx.toplam);
    }
  });

  const netKar = Math.max(0, toplamGelir - toplamGider);
  const karMarji = toplamGelir > 0 ? Math.round((netKar / toplamGelir) * 100) : 0;

  // 2. PIE CHART DYNAMICS & TABLES
  // Gelir Kalemleri Table Data
  let gelirRows = Array.from(gelirKategorileri.entries())
    .map(([kategori, miktar]) => ({
      kategori,
      miktar,
      oran: toplamGelir > 0 ? Math.round((miktar / toplamGelir) * 100) : 0,
    }))
    .sort((a, b) => b.miktar - a.miktar);

  // Gider Kalemleri Table Data
  const giderRows = Array.from(giderKategorileri.entries())
    .map(([kategori, miktar]) => ({
      kategori,
      miktar,
      oran: toplamGider > 0 ? Math.round((miktar / toplamGider) * 100) : 0,
    }))
    .sort((a, b) => b.miktar - a.miktar);

  // Group smaller items into "Diğer" for the Pie Chart max 4 slices
  let pieData = [];
  if (gelirRows.length <= 4) {
    pieData = [...gelirRows];
  } else {
    pieData = gelirRows.slice(0, 3);
    const digerMiktar = gelirRows.slice(3).reduce((acc, curr) => acc + curr.miktar, 0);
    const digerOran = toplamGelir > 0 ? Math.round((digerMiktar / toplamGelir) * 100) : 0;
    pieData.push({ kategori: "Diğer", miktar: digerMiktar, oran: digerOran });
  }

  // Generate Conic Gradient String
  let gradientParts: string[] = [];
  let currentPct = 0;
  pieData.forEach((d, idx) => {
    const isLast = idx === pieData.length - 1;
    // ensure last slice ends exactly at 100% to fill chart
    const nextPct = isLast ? 100 : currentPct + d.oran;
    const colorHex = PIE_COLORS[idx % PIE_COLORS.length].hex;
    gradientParts.push(`${colorHex} ${currentPct}% ${nextPct}%`);
    currentPct = nextPct;
  });

  const conicGradient = pieData.length > 0 
    ? `conic-gradient(${gradientParts.join(", ")})` 
    : "conic-gradient(#f1f5f9 0% 100%)";

  // 3. MONTHLY TREND (BAR CHART)
  // Calculate the last 6 months strictly
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let aylikTrend = [];

  for (let i = 5; i >= 0; i--) {
    let d = new Date(currentYear, currentMonth - i, 1);
    aylikTrend.push({
      ay: AYLAR[d.getMonth()],
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
      gelir: 0,
    });
  }

  // Attribute revenues to months
  islemler.forEach((tx) => {
    if (tx.tur_tipi === "satis" || tx.tur_tipi === "gelir") {
      const d = new Date(tx.tarih);
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        const y = d.getFullYear();
        const target = aylikTrend.find((x) => x.monthIndex === m && x.year === y);
        if (target) target.gelir += tx.toplam;
      }
    }
  });

  // Calculate percentages based on max revenue for chart heights
  const maxGelir = Math.max(...aylikTrend.map((m) => m.gelir), 1);
  const trendData = aylikTrend.map((m) => ({
    ay: m.ay,
    valK: Math.round(m.gelir / 1000), // value in K
    heightPct: Math.max(5, Math.round((m.gelir / maxGelir) * 100)), // min height 5% for visibility
  }));

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="flex min-h-screen font-[Manrope,sans-serif] bg-[#faf8ff] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 rounded-xl bg-[#4b41e1] mb-4"></div>
          <p className="text-slate-400 font-medium">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 px-8 py-10 bg-[#faf8ff]">
          <div className="mx-auto max-w-7xl space-y-7">
            {/* ── Title ── */}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gelir / Gider Analizi</h1>
              <p className="mt-1 text-sm text-slate-400">Dönemsel finansal performansınızı inceleyin ve raporlayın.</p>
            </div>

            {/* ── Filter Row ── */}
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:border-[#4b41e1]/30 hover:shadow-md transition-all">
                <span className="material-symbols-outlined text-[18px] text-slate-400">calendar_today</span>
                {dateRange}
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className="flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 active:scale-[0.97] transition-all">
                <span className="material-symbols-outlined text-[18px] text-slate-500">file_download</span>
                Raporu Dışa Aktar
              </button>
            </div>

            {/* ══════════════════════════════════════
               SUMMARY CARDS (DYNAMIC)
               ══════════════════════════════════════ */}
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {/* Toplam Gelir */}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 border-l-4 border-l-[#4b41e1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f3ff]">
                    <span className="material-symbols-outlined text-[#4b41e1] text-[20px]">trending_up</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Toplam Gelir</p>
                <p className="mt-1.5 text-2xl font-extrabold text-slate-800 tabular-nums">
                  {fmt(toplamGelir)} <span className="text-sm font-bold text-slate-400">TL</span>
                </p>
              </div>

              {/* Toplam Gider */}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 border-l-4 border-l-slate-400">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                    <span className="material-symbols-outlined text-slate-500 text-[20px]">trending_down</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Toplam Gider</p>
                <p className="mt-1.5 text-2xl font-extrabold text-slate-800 tabular-nums">
                  {fmt(toplamGider)} <span className="text-sm font-bold text-slate-400">TL</span>
                </p>
              </div>

              {/* Net Kâr */}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                    <span className="material-symbols-outlined text-emerald-600 text-[20px]">savings</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#f2f3ff] px-2.5 py-1 text-[11px] font-bold text-[#4b41e1]">
                    <span className="material-symbols-outlined text-[13px]">percent</span>{karMarji} Marj
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Net Kâr</p>
                <p className="mt-1.5 text-2xl font-extrabold text-emerald-600 tabular-nums">
                  {fmt(netKar)} <span className="text-sm font-bold text-emerald-400">TL</span>
                </p>
              </div>
            </section>

            {/* ══════════════════════════════════════
               MIDDLE — Donut + Tables (DYNAMIC)
               ══════════════════════════════════════ */}
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* ─ Donut Chart (col-span-4) ─ */}
              <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col">
                <h3 className="text-[15px] font-bold text-slate-800 mb-0.5">Gelir Dağılımı</h3>
                <p className="text-[11px] text-slate-400 mb-6">Kategorilere göre gelir oranları</p>

                {/* Donut Container */}
                <div className="flex justify-center mb-8 relative">
                  <div
                    className="h-48 w-48 rounded-full shadow-inner transition-all duration-700 ease-out"
                    style={{ background: conicGradient }}
                  />
                  {/* Inner cutout for Donut feel (optional, but looks better) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 bg-white rounded-full shadow-sm"></div>
                </div>

                {/* Legend */}
                <div className="space-y-3 mt-auto">
                  {pieData.map((l, i) => {
                    const colorClasses = PIE_COLORS[i % PIE_COLORS.length].bg;
                    return (
                      <div key={l.kategori} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <div className={`h-3 w-3 rounded-full shrink-0 ${colorClasses}`} />
                          <span className="text-[12px] font-semibold text-slate-600 truncate">{l.kategori}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-bold text-slate-400">%{l.oran}</span>
                          <span className="text-[12px] font-bold text-slate-700 tabular-nums whitespace-nowrap">{fmt(l.miktar)} TL</span>
                        </div>
                      </div>
                    );
                  })}
                  {pieData.length === 0 && (
                     <div className="text-center text-sm text-slate-400 py-4">Kayıtlı gelir bulunamadı.</div>
                  )}
                </div>
              </div>

              {/* ─ Tables side-by-side (col-span-8) ─ */}
              <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                  {/* Gelir Kalemleri */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-slate-50">
                      <span className="material-symbols-outlined text-[#4b41e1] text-[18px]">arrow_circle_up</span>
                      <h3 className="text-sm font-bold text-slate-800">Gelir Kalemleri</h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="text-left border-b border-slate-50 sticky top-0 bg-white">
                            <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">Kategori</th>
                            <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 text-right">Miktar</th>
                            <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 text-right w-14">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {gelirRows.map((r) => (
                            <tr key={r.kategori} className="hover:bg-[#f2f3ff]/30 transition-colors">
                              <td className="px-5 py-3 text-slate-600 font-medium">{r.kategori}</td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800 tabular-nums">{fmt(r.miktar)}</td>
                              <td className="px-5 py-3 text-right font-bold text-[#4b41e1] tabular-nums">%{r.oran}</td>
                            </tr>
                          ))}
                          {gelirRows.length === 0 && (
                            <tr><td colSpan={3} className="text-center py-6 text-slate-400 text-xs">Veri yok</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Gider Kalemleri */}
                  <div className="border-t md:border-t-0 md:border-l border-slate-50 flex flex-col">
                    <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-slate-50">
                      <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">arrow_circle_down</span>
                      <h3 className="text-sm font-bold text-slate-800">Gider Kalemleri</h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="text-left border-b border-slate-50 sticky top-0 bg-white">
                            <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">Kategori</th>
                            <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 text-right">Miktar</th>
                            <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 text-right w-14">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {giderRows.map((r) => (
                            <tr key={r.kategori} className="hover:bg-red-50/20 transition-colors">
                              <td className="px-5 py-3 text-slate-600 font-medium">{r.kategori}</td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800 tabular-nums">{fmt(r.miktar)}</td>
                              <td className="px-5 py-3 text-right font-bold text-slate-400 tabular-nums">%{r.oran}</td>
                            </tr>
                          ))}
                          {giderRows.length === 0 && (
                            <tr><td colSpan={3} className="text-center py-6 text-slate-400 text-xs">Veri yok</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════
               BOTTOM — Finansal Sağlık Özeti & Bar Chart (DYNAMIC)
               ══════════════════════════════════════ */}
            <section className="w-full rounded-[2rem] bg-white border border-slate-100 shadow-xl p-8 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 1/3 — insights */}
                <div className="flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4b41e1]/10">
                      <span className="material-symbols-outlined text-[#4b41e1] text-[26px]">insights</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Finansal Sağlık Özeti</h3>
                      <p className="text-[11px] text-slate-400">Son 6 ayın değerlendirmesi</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                    Mevcut rapor aralığındaki gelir/gider dengesine göre işletmeniz
                    <span className="font-bold text-emerald-600"> {karMarji > 0 ? "kârlı" : "dikkat gerektiren"} </span> 
                    bir performans sergiliyor. Kategorik dağılımlar ve dönemsel artışlar yakından takip edilmelidir.
                  </p>

                  {/* Summary boxes (Kept static visually but integrated into layout) */}
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Kâr Analizi</p>
                      <p className="text-xl font-extrabold text-emerald-600">Durum</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{netKar > 0 ? "Pozitif" : "Negatif"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Giderler</p>
                      <p className="text-xl font-extrabold text-slate-600">Özet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Kontrol altında</p>
                    </div>
                  </div>
                </div>

                {/* Right 2/3 — bar chart */}
                <div className="lg:col-span-2 p-6 pl-8 border-l border-slate-100 flex flex-col">
                  {/* Chart header */}
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Aylık Gelir Trendi</h4>
                      <p className="text-[11px] text-slate-400">Son 6 Ay</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#4b41e1]" />
                      <span className="text-[11px] font-semibold text-slate-500">Gelir (bin TL)</span>
                    </div>
                  </div>

                  {/* 6-bar chart */}
                  <div className="flex items-end justify-between gap-5 flex-1 mb-3">
                    {trendData.map((m, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                        <span className="text-[11px] font-bold text-slate-500 mb-2 tabular-nums">{m.valK > 0 ? `${m.valK}K` : ""}</span>
                        <div className="w-full flex justify-center items-end h-[150px]">
                          <div
                            className="w-11 rounded-t-xl bg-gradient-to-t from-[#4b41e1] to-[#8b83f0] transition-all duration-500 hover:from-[#3d35c4] hover:to-[#6c63f0] hover:shadow-lg hover:shadow-[#4b41e1]/20"
                            style={{ height: `${m.heightPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 mt-3">{m.ay}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
  );
}
