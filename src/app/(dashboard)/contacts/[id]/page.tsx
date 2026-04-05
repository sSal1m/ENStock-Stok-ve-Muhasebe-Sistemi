"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface ContactRecord {
  id: string;
  type: "customer" | "supplier";
  name: string;
  tax_number: string | null;
  tax_office: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  current_balance: number;
}

interface Islem {
  id: number;
  cari_id: string;
  tarih: string;
  fatura_no: string;
  islem_turu: string;
  tur_tipi: "satis" | "alis" | "odeme";
  toplam: number;
  durum: "Ödendi" | "Bekliyor" | "Gecikmiş";
}

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const TABS = ["Tüm İşlemler", "Satışlar", "Alışlar", "Ödemeler"] as const;
type Tab = (typeof TABS)[number];

/* ═══════════════════════════════════════════
   MOCK FALLBACK
   ═══════════════════════════════════════════ */

const MOCK_ISLEMLER: Islem[] = [
  { id: 1, cari_id: "", tarih: "28 Haz 2024", fatura_no: "FTR-2024-0847", islem_turu: "Satış Faturası", tur_tipi: "satis", toplam: 34250.0, durum: "Ödendi" },
  { id: 2, cari_id: "", tarih: "25 Haz 2024", fatura_no: "FTR-2024-0831", islem_turu: "Alış Faturası", tur_tipi: "alis", toplam: 18750.0, durum: "Bekliyor" },
  { id: 3, cari_id: "", tarih: "20 Haz 2024", fatura_no: "FTR-2024-0812", islem_turu: "Satış Faturası", tur_tipi: "satis", toplam: 52000.0, durum: "Gecikmiş" },
  { id: 4, cari_id: "", tarih: "15 Haz 2024", fatura_no: "ODM-2024-0156", islem_turu: "Ödeme (Havale)", tur_tipi: "odeme", toplam: 45000.0, durum: "Ödendi" },
  { id: 5, cari_id: "", tarih: "10 Haz 2024", fatura_no: "FTR-2024-0789", islem_turu: "Alış Faturası", tur_tipi: "alis", toplam: 27500.0, durum: "Ödendi" },
  { id: 6, cari_id: "", tarih: "05 Haz 2024", fatura_no: "FTR-2024-0761", islem_turu: "Satış Faturası", tur_tipi: "satis", toplam: 41800.0, durum: "Bekliyor" },
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const durumStyle = (d: Islem["durum"]) => {
  switch (d) {
    case "Ödendi":
      return "bg-emerald-50 text-emerald-700";
    case "Bekliyor":
      return "bg-amber-50 text-amber-700";
    case "Gecikmiş":
      return "bg-error-container/20 text-error";
    default:
      return "bg-slate-50 text-slate-700";
  }
};

const turIcon = (t: Islem["tur_tipi"]) => {
  switch (t) {
    case "satis": return { icon: "arrow_upward", color: "text-emerald-500" };
    case "alis": return { icon: "arrow_downward", color: "text-error" };
    case "odeme": return { icon: "swap_horiz", color: "text-primary" };
    default: return { icon: "info", color: "text-slate-400" };
  }
};

const tabKategori = (t: Islem["tur_tipi"]): "Satışlar" | "Alışlar" | "Ödemeler" => {
  switch (t) {
    case "satis": return "Satışlar";
    case "alis": return "Alışlar";
    case "odeme": return "Ödemeler";
    default: return "Satışlar";
  }
};

const avatarGradient = (tip: "customer" | "supplier") =>
  tip === "supplier"
    ? "from-amber-400 to-orange-500"
    : "from-emerald-400 to-emerald-600";

const badgeStyle = (tip: "customer" | "supplier") =>
  tip === "supplier"
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function ContactDetailPage() {
  const params = useParams();
  const cariId = params.id as string;

  const [cari, setCari] = useState<ContactRecord | null>(null);
  const [islemler, setIslemler] = useState<Islem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Tüm İşlemler");

  // ── Fetch cari record ──
  useEffect(() => {
    const fetchData = async () => {
      if (!cariId) return;
      setLoading(true);

      try {
        const { data: cariData, error: cariError } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", cariId)
          .single();

        if (cariError || !cariData) {
          console.error("Cari bulunamadı:", cariError);
          setNotFound(true);
          setLoading(false);
          return;
        }

        setCari(cariData as ContactRecord);

        const { data: islemData, error: islemError } = await supabase
          .from("islemler")
          .select("*")
          .eq("cari_id", cariId)
          .order("tarih", { ascending: false });

        if (islemError) {
          setIslemler(MOCK_ISLEMLER.map((i) => ({ ...i, cari_id: cariId })));
        } else {
          setIslemler((islemData as Islem[]) || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cariId]);

  const filtered =
    activeTab === "Tüm İşlemler"
      ? islemler
      : islemler.filter((i) => tabKategori(i.tur_tipi) === activeTab);

  const bakiye = cari?.current_balance ?? 0;
  const isBorclu = bakiye < 0;
  const bakiyeLabel = isBorclu ? "Güncel Borç" : "Güncel Alacak";
  const bakiyeColor = isBorclu ? "text-error" : "text-emerald-600";
  const bakiyeBg = isBorclu ? "bg-error-container/20 border-error/10" : "bg-emerald-50/60 border-emerald-100";

  const bekleyen = islemler.filter((i) => i.durum === "Bekliyor").reduce((s, i) => s + i.toplam, 0);
  const gecikmis = islemler.filter((i) => i.durum === "Gecikmiş").reduce((s, i) => s + i.toplam, 0);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse text-slate-400">
        <div className="h-8 w-1/3 bg-slate-200 rounded mb-4" />
        <div className="h-32 bg-slate-100 rounded" />
      </div>
    );
  }

  if (notFound || !cari) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 mb-6 font-black text-slate-300 text-4xl">!</div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Cari Bulunamadı</h2>
        <p className="text-sm text-slate-400 mb-6">ID #{cariId} ile eşleşen bir cari hesap kaydı bulunamadı.</p>
        <Link href="/contacts" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Cari Rehberine Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── BREADCRUMBS & HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
            <Link href="/contacts" className="hover:text-primary transition-colors">Cari Hesaplar</Link>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-slate-500">Cari Detay</span>
          </nav>
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(cari.type)} text-white text-lg font-black shadow-lg`}>
              {cari.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-on-surface tracking-tight">{cari.name}</h1>
                <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-black uppercase ${badgeStyle(cari.type)}`}>
                  {cari.type === "customer" ? "Müşteri" : "Tedarikçi"}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-bold text-slate-400">
                {cari.tax_number ? `VKN/TC: ${cari.tax_number}` : "VKN: —"} · {cari.address ? (cari.address.length > 50 ? cari.address.substring(0, 50) + "..." : cari.address) : "Adres Belirtilmemiş"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-white border border-indigo-100 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Düzenle
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-primary text-on-primary px-5 py-2.5 text-sm font-black shadow-lg hover:bg-opacity-90 transition-all">
            <span className="material-symbols-outlined text-[18px]">receipt</span>
            Yeni Fatura
          </button>
        </div>
      </div>

      {/* ── BENTO GRID Info + Balance ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">badge</span>
            <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Cari Bilgileri</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50/50">
                <span className="material-symbols-outlined text-primary text-xl">call</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefon</p>
                <p className="text-sm font-bold text-on-surface">{cari.phone || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50/50">
                <span className="material-symbols-outlined text-primary text-xl">mail</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-posta</p>
                <p className="text-sm font-bold text-on-surface">{cari.email || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50/50">
                <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vergi Bilgisi</p>
                <p className="text-sm font-bold text-on-surface">
                  {cari.tax_office || "—"} / {cari.tax_number || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50/50">
                <span className="material-symbols-outlined text-primary text-xl">location_on</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adres</p>
                <p className="text-sm font-bold text-on-surface leading-relaxed">{cari.address || "Belirtilmemiş"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <span className={`material-symbols-outlined text-xl ${isBorclu ? "text-error" : "text-emerald-500"}`}>account_balance_wallet</span>
            <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Bakiye Özeti</h3>
          </div>

          <div className={`rounded-2xl border p-6 text-center mb-6 ${bakiyeBg}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{bakiyeLabel}</p>
            <p className={`text-3xl font-black tabular-nums ${bakiyeColor}`}>₺{fmt(Math.abs(bakiye))}</p>
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-indigo-50/50 px-4 py-3">
              <span className="text-xs font-bold text-slate-500">Bekleyen</span>
              <span className="text-sm font-black text-on-surface tabular-nums">₺{fmt(bekleyen)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-indigo-50/50 px-4 py-3">
              <span className="text-xs font-bold text-slate-500">Gecikmiş</span>
              <span className="text-sm font-black text-error tabular-nums">₺{fmt(gecikmis)}</span>
            </div>
          </div>

          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-black text-on-primary shadow-lg transition-all active:scale-95">
            <span className="material-symbols-outlined text-lg">payments</span>
            İşlem Yap
          </button>
        </div>
      </section>

      {/* ── TRANSACTION HISTORY ── */}
      <section className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-8 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">history</span>
            <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">İşlem Geçmişi</h3>
          </div>
          <span className="text-xs font-bold text-slate-300">{filtered.length} İşlem</span>
        </div>

        <div className="flex items-center gap-6 px-8 border-b border-indigo-50/50">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab ? "text-primary" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50 text-slate-500">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.1em]">Tarih</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em]">Fatura No</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em]">İşlem</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-right">Tutar</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {/* TODO: Connect to invoices table - currently using mock data as fallback */}
              {(filtered && Array.isArray(filtered) ? filtered : []).map((tx) => {
                const { icon, color } = turIcon(tx.tur_tipi);
                return (
                  <tr key={tx.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{tx.tarih}</td>
                    <td className="px-4 py-4">
                      <span className="inline-block rounded-lg bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1 font-mono text-[11px] font-black text-primary">
                        {tx.fatura_no}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-lg ${color}`}>{icon}</span>
                        <span className="text-sm font-bold text-on-surface">{tx.islem_turu}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-black text-on-surface tabular-nums">
                      {tx.tur_tipi === "alis" ? "-" : ""}₺{fmt(tx.toplam)}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${durumStyle(tx.durum)}`}>
                        {tx.durum}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!filtered || filtered.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold">
                    {islemler.length === 0 
                      ? "Bu cari hesaba ait işlem bulunmamaktadır."
                      : "Seçilen filtre için işlem bulunamadı."
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
