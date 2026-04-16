"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchDashboardSummary, DashboardSummaryResponse } from "@/services/reportService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const PIE_COLORS = ["#4b41e1", "#10b981", "#f59e0b", "#94a3b8", "#fb7185", "#8b5cf6"];

/* ═══════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════ */

export default function RaporlarSayfasi() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [dateRange] = useState("Genel Rapor & Son 6 Ay Özeti");

  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const data = await fetchDashboardSummary(user.id);
          setSummary(data);
        } else {
          console.warn("Raporları görüntülemek için oturum açmalısınız.");
        }
      } catch (err) {
        console.error("RPC fetch hatası:", err);
      } finally {
        setLoading(false);
      }
    };

    initFetch();
  }, []);

  /* ═══════════════════════════════════════════
     SKELETON / LOADING
     ═══════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-purple-600 animate-spin">refresh</span>
          </div>
          <p className="text-slate-400 font-medium">Veriler oluşturuluyor ve grafikler çiziliyor...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500">Veriler yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin.</p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     1. GLOBAL AGGREGATIONS
     ═══════════════════════════════════════════ */
  const toplamGelir = Number(summary.total_income);
  const toplamGider = Number(summary.total_expense);
  const netKar = toplamGelir - toplamGider;
  const karMarji = toplamGelir > 0 ? Math.round((netKar / toplamGelir) * 100) : 0;
  const stokAdedi = Number(summary.total_stock);

  /* ═══════════════════════════════════════════
     2. CHART DATA PREPARATION
     ═══════════════════════════════════════════ */
  
  // -- PIE CHART (Gelir Dağılımı)
  let pieData = (summary.income_by_category || []).map(item => ({
    name: item.category_name,
    value: Number(item.amount)
  }));
  pieData.sort((a, b) => b.value - a.value);

  // Kategorilere girmeyen diğer gelirleri de ekleyelim
  let topIncomeAmount = pieData.reduce((sum, d) => sum + d.value, 0);
  let otherIncome = Math.max(0, toplamGelir - topIncomeAmount);
  if (otherIncome > 0 && toplamGelir > 0) {
    pieData.push({ name: "Diğer", value: otherIncome });
  }

  // Özel Tooltip (Donut)
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border text-sm border-slate-100 p-3 rounded-lg shadow-lg">
          <p className="font-bold text-slate-800 mb-1">{data.name}</p>
          <p className="text-primary font-semibold">{fmt(data.value)} TL</p>
        </div>
      );
    }
    return null;
  };

  // -- BAR CHART (Aylık Trend)
  const barData = (summary.monthly_trend || []).map(m => ({
    name: m.month_name,
    Gelir: Number(m.income),
    Gider: Number(m.expense)
  }));

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="p-6 lg:p-10 space-y-8 w-full">
      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gelir / Gider Analizi</h1>
        <p className="mt-1 text-sm text-slate-500">Mali durumunuzu canlı grafikler ile inceleyin.</p>
      </div>

      {/* ── Filter Row ── */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl bg-white border border-indigo-100 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:border-primary/20 transition-all">
          <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
          {dateRange}
        </button>
      </div>

      {/* ══════════════════════════════════════
          SUMMARY CARDS
          ══════════════════════════════════════ */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        {/* Toplam Gelir */}
        <div className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-6 border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Gelir</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 tabular-nums">
            {fmt(toplamGelir)} <span className="text-sm font-bold text-slate-400">TL</span>
          </p>
        </div>

        {/* Toplam Gider */}
        <div className="rounded-2xl bg-white border border-indigo-50/50 shadow-sm p-6 border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
              <span className="material-symbols-outlined text-rose-500">trending_down</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Gider</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 tabular-nums">
            {fmt(toplamGider)} <span className="text-sm font-bold text-slate-400">TL</span>
          </p>
        </div>

        {/* Net Kâr */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow relative">
          <div className="absolute top-4 right-4 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-bold">
            {karMarji}% Marj
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <span className="material-symbols-outlined text-emerald-600">savings</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Net Kâr</p>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">
            {fmt(netKar)} <span className="text-sm font-bold text-emerald-400">TL</span>
          </p>
        </div>

        {/* Toplam Stok */}
        <div className="rounded-2xl bg-white border border-amber-50/50 shadow-sm p-6 border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <span className="material-symbols-outlined text-amber-500">inventory_2</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Stok</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 tabular-nums">
            {fmt(stokAdedi)} <span className="text-sm font-bold text-slate-400">Birim</span>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CHARTS SECTION (RECHARTS)
          ══════════════════════════════════════ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ─ Donut Chart (Gelir Dağılımı) ─ */}
        <div className="lg:col-span-4 rounded-2xl bg-white shadow-sm border border-slate-100 p-6 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">pie_chart</span>
              <h3 className="text-sm font-bold text-slate-800">Gelir Dağılımı</h3>
            </div>
          </div>
          
          {pieData.length > 0 ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={renderCustomTooltip} />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Kayıtlı veri bulunamadı.
            </div>
          )}
        </div>

        {/* ─ Bar Chart (Aylık Trend) ─ */}
        <div className="lg:col-span-8 rounded-2xl bg-white shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="w-full flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">bar_chart</span>
              <h3 className="text-sm font-bold text-slate-800">Aylık Finansal Trend (Son 6 Ay)</h3>
            </div>
          </div>
          
          <div className="w-full flex-1 min-h-[250px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `${val / 1000}k`}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 600 }}
                  />
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#64748b', paddingTop: '20px' }}
                  />
                  <Bar dataKey="Gelir" fill="#4b41e1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Gider" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                  Veri bulunamadı.
                </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TOP CONTACTS & EXPENSE ITEMS
          ══════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Cari Tablosu */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
            <span className="material-symbols-outlined text-amber-500">star</span>
            <h3 className="text-sm font-bold text-slate-800">En Çok İşlem Gören Cariler (Top 5)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-slate-400 font-semibold uppercase tracking-wide">#</th>
                  <th className="py-2 px-3 text-slate-400 font-semibold uppercase tracking-wide">Ünvan</th>
                  <th className="py-2 px-3 text-slate-400 font-semibold uppercase tracking-wide text-right">İşlem Hacmi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.top_contacts.length > 0 ? (
                  summary.top_contacts.map((contact, idx) => (
                    <tr key={contact.contact_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-700">{contact.contact_name}</td>
                      <td className="py-3 px-3 text-right font-bold text-primary tabular-nums">
                        {fmt(Number(contact.total_volume))} TL
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">İşlem bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gider Dağılımı Tablosu */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
            <span className="material-symbols-outlined text-rose-500">list_alt</span>
            <h3 className="text-sm font-bold text-slate-800">En Çok Gider Oluşturan Kalemler</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-slate-400 font-semibold uppercase tracking-wide">Kategori / Ürün</th>
                  <th className="py-2 px-3 text-slate-400 font-semibold uppercase tracking-wide text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.expense_by_category && summary.expense_by_category.length > 0 ? (
                  summary.expense_by_category.map((exp, idx) => (
                    <tr key={exp.category_name + idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-700 truncate max-w-[200px]">{exp.category_name}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-500 tabular-nums">
                        {fmt(Number(exp.amount))} TL
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400">Veri bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
