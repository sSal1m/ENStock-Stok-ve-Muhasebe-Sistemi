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
        setIslemler(MOCK_ISLEMLER);
      } else {
        setIslemler((data as Islem[]) || []);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // ... aggregations logic same as before ...
  let toplamGelir = 0;
  let toplamGider = 0;
  const gelirKategorileri = new Map<string, number>();
  const giderKategorileri = new Map<string, number>();

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

  let gelirRows = Array.from(gelirKategorileri.entries())
    .map(([kategori, miktar]) => ({
      kategori,
      miktar,
      oran: toplamGelir > 0 ? Math.round((miktar / toplamGelir) * 100) : 0,
    }))
    .sort((a, b) => b.miktar - a.miktar);

  const giderRows = Array.from(giderKategorileri.entries())
    .map(([kategori, miktar]) => ({
      kategori,
      miktar,
      oran: toplamGider > 0 ? Math.round((miktar / toplamGider) * 100) : 0,
    }))
    .sort((a, b) => b.miktar - a.miktar);

  let pieData = [];
  if (gelirRows.length <= 4) {
    pieData = [...gelirRows];
  } else {
    pieData = gelirRows.slice(0, 3);
    const digerMiktar = gelirRows.slice(3).reduce((acc, curr) => acc + curr.miktar, 0);
    const digerOran = toplamGelir > 0 ? Math.round((digerMiktar / toplamGelir) * 100) : 0;
    pieData.push({ kategori: "Diğer", miktar: digerMiktar, oran: digerOran });
  }

  let gradientParts: string[] = [];
  let currentPct = 0;
  pieData.forEach((d, idx) => {
    const isLast = idx === pieData.length - 1;
    const nextPct = isLast ? 100 : currentPct + d.oran;
    const colorHex = PIE_COLORS[idx % PIE_COLORS.length].hex;
    gradientParts.push(`${colorHex} ${currentPct}% ${nextPct}%`);
    currentPct = nextPct;
  });

  const conicGradient = pieData.length > 0 
    ? `conic-gradient(${gradientParts.join(", ")})` 
    : "conic-gradient(#f1f5f9 0% 100%)";

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

  const maxGelir = Math.max(...aylikTrend.map((m) => m.gelir), 1);
  const trendData = aylikTrend.map((m) => ({
    ay: m.ay,
    valK: Math.round(m.gelir / 1000),
    heightPct: Math.max(5, Math.round((m.gelir / maxGelir) * 100)),
  }));

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col items-center justify-center h-64">
        <div className="h-10 w-10 rounded-xl bg-primary mb-4" />
        <p className="text-slate-400 font-bold">Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Title Area ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
            <span className="material-symbols-outlined text-[14px]">analytics</span>
            <span>Finansal Raporlar</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Gelir / Gider Analizi</h1>
          <p className="mt-1 text-sm font-bold text-slate-400">Dönemsel finansal performansınızı inceleyin ve raporlayın.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:shadow-md transition-all">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            {dateRange}
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-primary text-on-primary px-5 py-2.5 text-sm font-bold shadow-lg hover:shadow-xl transition-all">
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Raporu İndir
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-6 border-l-4 border-l-primary">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Toplam Gelir</p>
          <p className="text-3xl font-extrabold text-on-surface tabular-nums">
            {fmt(toplamGelir)} <span className="text-sm text-slate-400">TL</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-6 border-l-4 border-l-slate-400">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Toplam Gider</p>
          <p className="text-3xl font-extrabold text-on-surface tabular-nums">
            {fmt(toplamGider)} <span className="text-sm text-slate-400">TL</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-6 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Kâr</p>
          <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">
            {fmt(netKar)} <span className="text-sm text-emerald-400">TL</span>
          </p>
        </div>
      </section>

      {/* ── DISTRIBUTION ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-8 flex flex-col">
          <h3 className="text-sm font-black text-on-surface uppercase tracking-widest mb-6">Gelir Dağılımı</h3>
          <div className="flex justify-center mb-10 relative">
            <div className="h-48 w-48 rounded-full" style={{ background: conicGradient }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 bg-white rounded-full shadow-inner" />
          </div>
          <div className="space-y-4">
            {pieData.map((l, i) => (
              <div key={l.kategori} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${PIE_COLORS[i % PIE_COLORS.length].bg}`} />
                  <span className="text-xs font-bold text-slate-600">{l.kategori}</span>
                </div>
                <span className="text-xs font-extrabold text-on-surface">%{l.oran}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl bg-white border border-indigo-50/50 shadow-sm overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            <div className="p-6 border-r border-indigo-50/50">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4">En Yüksek Gelirler</h3>
              <div className="space-y-3">
                {gelirRows.slice(0, 5).map(r => (
                  <div key={r.kategori} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-indigo-50/50">
                    <span className="text-xs font-bold text-slate-600">{r.kategori}</span>
                    <span className="text-xs font-black text-on-surface">₺{fmt(r.miktar)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xs font-black text-error uppercase tracking-widest mb-4">En Yüksek Giderler</h3>
              <div className="space-y-3">
                {giderRows.slice(0, 5).map(r => (
                  <div key={r.kategori} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-indigo-50/50">
                    <span className="text-xs font-bold text-slate-600">{r.kategori}</span>
                    <span className="text-xs font-black text-on-surface">₺{fmt(r.miktar)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TREND CHART ── */}
      <section className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Aylık Gelir Trendi</h3>
            <p className="text-xs font-bold text-slate-400">Son 6 Ayın Performansı</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gelir (Bin TL)</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-4 h-48">
          {trendData.map((m, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 tabular-nums">{m.valK}K</span>
              <div className="w-full bg-slate-50 border border-indigo-50/50 rounded-lg h-full p-1 flex items-end">
                <div 
                  className="w-full bg-primary rounded-md transition-all duration-700 ease-out" 
                  style={{ height: `${m.heightPct}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">{m.ay}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
