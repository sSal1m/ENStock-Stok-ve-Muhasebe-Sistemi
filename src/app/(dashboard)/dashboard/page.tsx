'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { getRecentActivityLogs, type ActivityLogRecord } from '@/app/(dashboard)/activity-log/actions';
import ActivityLogList from '@/components/activity-log/ActivityLogList';
import * as XLSX from 'xlsx';

interface KPIData {
  totalProducts: number;
  criticalStockItems: number;
  todayRevenue: number;
  stockHealth: number;
}

interface ActivityLog {
  id: string;
  product_name: string;
  operation_type: string;
  quantity: number;
  created_at: string;
  status: 'completed' | 'pending' | 'delayed';
}

interface ChartDataPoint {
  name: string;
  revenue: number;
  profit: number;
}

interface CategoryData {
  id: string;
  name: string;
  totalProducts: number;
  totalValue: number;
}

interface VendorData {
  id: string;
  name: string;
  type: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [kpiData, setKpiData] = useState<KPIData>({
    totalProducts: 0,
    criticalStockItems: 0,
    todayRevenue: 0,
    stockHealth: 0,
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [rawInvoiceItems, setRawInvoiceItems] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { rates, viewCurrency, setViewCurrency, convert, format: fmt } = useCurrencyConverter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/login");
          return;
        }

        const { fetchTeamScopedData } = await import("@/app/(dashboard)/teamActions");

        const [
          productsRes,
          revenueRes,
          activitiesRes,
          contactsRes,
          invoicesDetailsRes,
        ] = await Promise.all([
          fetchTeamScopedData(
            authUser.id,
            'products',
            'id, name, stock_quantity, critical_limit, sale_price, currency, sale_price_in_currency',
            { excludeDeleted: true }
          ),

          // ✅ Currency-aware revenue: total_amount fatura para biriminde saklı,
          //   exchange_rate ile TRY karşılığını hesaplıyoruz
          fetchTeamScopedData(
            authUser.id,
            'invoices',
            'id, total_amount, currency, exchange_rate, type, issue_date',
            { excludeDeleted: true }
          ),

          fetchTeamScopedData(
            authUser.id,
            'inventory_logs',
            'id, action_type, quantity_change, created_at, products(name)',
            { orderBy: 'created_at', orderAscending: false, limit: 5 }
          ),

          fetchTeamScopedData(
            authUser.id,
            'contacts',
            'id, name, type',
            { excludeDeleted: true, limit: 10 }
          ),

          // Son 7 gün satış trendleri + COGS hesabı için fatura kalemleri + ürün maliyeti
          fetchTeamScopedData(
            authUser.id,
            'invoice_items',
            'quantity, unit_price, invoice_id, product_id, invoices!inner(issue_date, type, currency, exchange_rate, deleted_at, user_id), products(purchase_price)',
            {
              teamFilterColumn: 'invoices.user_id',
              additionalFilters: [
                { column: 'invoices.deleted_at', operator: 'is', value: null },
                { column: 'invoices.type', operator: 'eq', value: 'sale' },
                { column: 'invoices.issue_date', operator: 'gte', value: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
              ]
            }
          ),
        ]);

        const allProducts = productsRes.data || [];
        const totalProducts = allProducts.length;

        const criticalCount = allProducts.filter(
          (p: any) => p.stock_quantity <= (p.critical_limit || 10)
        ).length;

        // En çok stoktaki ürünleri hesapla — totalValue her zaman TRY karşılığında
        // tutulur; display tarafında convert(TRY → viewCurrency) uygulanır.
        const topProducts = allProducts
          .filter((product: any) => product.stock_quantity > 0)
          .map((product: any) => {
            const priceTry = parseFloat(product.sale_price || 0); // TRY karşılığı
            return {
              id: product.id,
              name: product.name || 'Ürün',
              totalProducts: product.stock_quantity || 0,
              totalValue: isNaN(priceTry) ? 0 : (priceTry * (product.stock_quantity || 0)),
            };
          })
          .sort((a: any, b: any) => b.totalProducts - a.totalProducts)
          .slice(0, 3);

        // Faturalar farklı para birimlerinde olabilir; her birini exchange_rate
        // ile TRY'ye çevirip topluyoruz. Display tarafında convert(TRY → viewCurrency)
        // ile gösterilecek. Sadece "sale" faturalar ciro sayılır.
        let totalRevenueTry = 0;
        if (revenueRes.data) {
          totalRevenueTry = revenueRes.data
            .filter((inv: any) => inv.type === 'sale')
            .reduce((sum: number, inv: any) => {
              const amount = Number(inv.total_amount) || 0;
              const rate = Number(inv.exchange_rate) || 1; // 1 USD = ? TRY
              return sum + amount * rate;
            }, 0);
        }

        let processedActivities: ActivityLog[] = [];
        if (activitiesRes.data) {
          processedActivities = activitiesRes.data
            .filter((log: any) => log && log.id)
            .map((log: any) => ({
              id: log.id,
              product_name: log.products?.name || log.product_name || 'Ürün',
              operation_type: log.action_type || 'unknown',
              quantity: log.quantity_change || 0,
              created_at: log.created_at || new Date().toISOString(),
              status: getActivityStatus(log.action_type),
            }));
        }

        // Tedarikçi verileri - tüm contacts'tan seç (type filter yok)
        const vendorData = (contactsRes.data || [])
          .slice(0, 2)
          .map((contact: any) => ({
            id: contact.id,
            name: contact.name,
            type: 'Tier 1 Partner',
          }));

        const nonCriticalProducts = totalProducts - criticalCount;
        const stockHealth =
          totalProducts > 0
            ? Math.round((nonCriticalProducts / totalProducts) * 100)
            : 0;

        // Gerçek satış trendleri hesapla — invoice_items + product.purchase_price ile
        // gerçek COGS hesabı yapılır.
        const allItems = invoicesDetailsRes.data || [];
        setRawInvoiceItems(allItems);

        setKpiData({
          totalProducts,
          criticalStockItems: criticalCount,
          todayRevenue: totalRevenueTry,
          stockHealth,
        });
        setActivities(processedActivities);
        setCategories(topProducts);
        setVendors(vendorData);

        // Aktivite logları (CRUD audit trail)
        const logsRes = await getRecentActivityLogs(authUser.id, 6);
        if (logsRes.success) {
          setActivityLogs(logsRes.data);
        }
      } catch (error) {
        console.error('Dashboard veri yükleme hatası:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            toast.error('Oturum süresi doldu. Lütfen yeniden giriş yapın.');
          } else if (error.message.includes('403')) {
            toast.error('Bu işlem için yeterli izniniz yok.');
          } else {
            toast.error('Veriler yüklenirken hata oluştu: ' + error.message);
          }
        } else {
          toast.error('Veriler yüklenirken hata oluştu');
        }
        
        setKpiData({
          totalProducts: 0,
          criticalStockItems: 0,
          todayRevenue: 0,
          stockHealth: 0,
        });
        setActivities([]);
        setCategories([]);
        setVendors([]);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const points = generateChartDataForPeriod(rawInvoiceItems, chartPeriod);
    setChartData(points);
  }, [chartPeriod, rawInvoiceItems]);

  const getActivityStatus = (type: string) => {
    if (type === 'stock_in') return 'completed' as const;
    if (type === 'sale') return 'completed' as const;
    if (type === 'return') return 'pending' as const;
    return 'delayed' as const;
  };

  const generateChartDataForPeriod = (items: any[], period: 'daily' | 'weekly' | 'monthly'): ChartDataPoint[] => {
    const getTurkishMonth = (mIndex: number) => {
      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return months[mIndex] || '';
    };

    if (period === 'daily') {
      const daysList: { dateStr: string; label: string; revenue: number; profit: number }[] = [];
      for (let i = 9; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = `${d.getDate()} ${getTurkishMonth(d.getMonth())}`;
        daysList.push({ dateStr, label, revenue: 0, profit: 0 });
      }

      items.forEach((item: any) => {
        const inv = Array.isArray(item.invoices) ? item.invoices[0] : item.invoices;
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        if (!inv?.issue_date) return;

        const dateStr = inv.issue_date.split('T')[0];
        const dayObj = daysList.find(d => d.dateStr === dateStr);
        if (!dayObj) return;

        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const rate = Number(inv.exchange_rate) || 1;
        const revenueTry = qty * unitPrice * rate;

        const purchasePriceTry = Number(product?.purchase_price) || 0;
        const cogsTry = qty * purchasePriceTry;

        dayObj.revenue += revenueTry;
        dayObj.profit += (revenueTry - cogsTry);
      });

      return daysList.map(d => ({
        name: d.label,
        revenue: Math.round(d.revenue),
        profit: Math.round(d.profit)
      }));

    } else if (period === 'weekly') {
      const weeksList: { start: Date; end: Date; label: string; revenue: number; profit: number }[] = [];
      
      const currentMonday = new Date();
      const currentDay = currentMonday.getDay();
      const diff = currentMonday.getDate() - (currentDay === 0 ? 6 : currentDay - 1);
      currentMonday.setDate(diff);
      currentMonday.setHours(0, 0, 0, 0);

      for (let i = 7; i >= 0; i--) {
        const monday = new Date(currentMonday);
        monday.setDate(monday.getDate() - i * 7);
        
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const label = `${monday.getDate()} ${getTurkishMonth(monday.getMonth())}`;
        weeksList.push({ start: monday, end: sunday, label, revenue: 0, profit: 0 });
      }

      items.forEach((item: any) => {
        const inv = Array.isArray(item.invoices) ? item.invoices[0] : item.invoices;
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        if (!inv?.issue_date) return;

        const issueDate = new Date(inv.issue_date);
        const weekObj = weeksList.find(w => issueDate >= w.start && issueDate <= w.end);
        if (!weekObj) return;

        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const rate = Number(inv.exchange_rate) || 1;
        const revenueTry = qty * unitPrice * rate;

        const purchasePriceTry = Number(product?.purchase_price) || 0;
        const cogsTry = qty * purchasePriceTry;

        weekObj.revenue += revenueTry;
        weekObj.profit += (revenueTry - cogsTry);
      });

      return weeksList.map(w => ({
        name: w.label,
        revenue: Math.round(w.revenue),
        profit: Math.round(w.profit)
      }));

    } else {
      const monthsList: { year: number; month: number; label: string; revenue: number; profit: number }[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsList.push({
          year: d.getFullYear(),
          month: d.getMonth(),
          label: `${getTurkishMonth(d.getMonth())}`,
          revenue: 0,
          profit: 0
        });
      }

      items.forEach((item: any) => {
        const inv = Array.isArray(item.invoices) ? item.invoices[0] : item.invoices;
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        if (!inv?.issue_date) return;

        const issueDate = new Date(inv.issue_date);
        const monthObj = monthsList.find(m => m.year === issueDate.getFullYear() && m.month === issueDate.getMonth());
        if (!monthObj) return;

        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const rate = Number(inv.exchange_rate) || 1;
        const revenueTry = qty * unitPrice * rate;

        const purchasePriceTry = Number(product?.purchase_price) || 0;
        const cogsTry = qty * purchasePriceTry;

        monthObj.revenue += revenueTry;
        monthObj.profit += (revenueTry - cogsTry);
      });

      return monthsList.map(m => ({
        name: m.label,
        revenue: Math.round(m.revenue),
        profit: Math.round(m.profit)
      }));
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return { bg: 'bg-green-100', text: 'text-green-700' };
    if (status === 'pending')
      return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return 'TAMAMLANDI';
    if (status === 'pending') return 'BEKLEMEDE';
    return 'GECİKMİŞ';
  };

  // Helper functions moved to hook

  const handleExportXlsx = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // 1. KPI Sayfası (Genel Özellikler)
      const kpiExport = [
        { "Metrik": "Toplam Ürün", "Değer": kpiData.totalProducts.toString() },
        { "Metrik": "Kritik Stok Ürünleri", "Değer": kpiData.criticalStockItems.toString() },
        { "Metrik": "Günlük Satış Cirosu", "Değer": fmt(convert(kpiData.todayRevenue), viewCurrency) },
        { "Metrik": "Stok Sağlığı", "Değer": `%${kpiData.stockHealth}` },
      ];
      const kpiSheet = XLSX.utils.json_to_sheet(kpiExport);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, "Özet Veriler");

      // 2. Aktiviteler Sayfası
      if (activities && activities.length > 0) {
        const activitiesExport = activities.map(a => ({
          "Tarih": new Date(a.created_at).toLocaleDateString('tr-TR'),
          "Ürün": a.product_name,
          "İşlem Türü": a.operation_type === 'stock_in' ? 'Stok Girişi' : a.operation_type === 'sale' ? 'Satış' : 'İade',
          "Değişim Miktarı": a.quantity,
          "Durum": getStatusLabel(a.status)
        }));
        const activitiesSheet = XLSX.utils.json_to_sheet(activitiesExport);
        XLSX.utils.book_append_sheet(workbook, activitiesSheet, "Son İşlemler");
      }

      XLSX.writeFile(workbook, `Genel_Rapor_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Rapor başarıyla excel dosyası olarak indirildi.");
    } catch (error) {
      console.error(error);
      toast.error("Rapor oluşturulurken bir hata meydana geldi.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
            Finansal Görünüm
          </h1>
          <p className="text-on-surface-variant mt-1">
            Gerçek zamanlı performans metrikleri.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white border border-indigo-100 rounded-xl px-4 py-2 shadow-sm">
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
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border-none rounded-xl text-sm font-semibold text-slate-600 shadow-sm hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[18px]">
              calendar_today
            </span>
            Son 30 Gün
          </button>
          <button onClick={handleExportXlsx} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Raporu Dışa Aktar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <span className="material-symbols-outlined text-2xl">inventory</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-500">Toplam Ürün</p>
          <h3 className="text-2xl font-black text-indigo-900">
            {kpiData.totalProducts.toLocaleString('tr-TR')}
          </h3>
        </div>

        {/* Critical Stock Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-error-container/30 text-error rounded-lg">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-500">Kritik Stok Ürünleri</p>
          <h3 className="text-2xl font-black text-error">
            {kpiData.criticalStockItems}
          </h3>
        </div>

        {/* Today's Revenue Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Günlük Satış Cirosu
          </p>
          <h3 className="text-2xl font-extrabold mt-1 text-slate-900">
            {fmt(convert(kpiData.todayRevenue), viewCurrency)}
          </h3>
        </div>

        {/* Recent Transactions Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <span className="material-symbols-outlined text-2xl">history</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-500">Son İşlemler</p>
          <h3 className="text-2xl font-black text-primary">
            {activities.length}
          </h3>
        </div>
      </div>

      {/* Bento Layout Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-6 pb-4 shadow-sm relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                <h2 className="text-xl font-bold text-on-surface">Finansal Performans</h2>
              </div>
              
              <div className="flex flex-wrap items-center justify-end gap-4 sm:ml-auto">
                {/* Legend */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-0.5 bg-[#4b41e1]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4b41e1] -ml-2.5"></div>
                    <span className="text-xs font-semibold text-slate-500 ml-1">Net Kâr/Zarar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-xs font-semibold text-slate-500">Net Kâr</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-rose-500"></div>
                    <span className="text-xs font-semibold text-slate-500">Net Zarar</span>
                  </div>
                </div>

                {/* Period Selector Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => { setChartPeriod('daily'); setHoveredIndex(null); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartPeriod === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Günlük
                  </button>
                  <button
                    onClick={() => { setChartPeriod('weekly'); setHoveredIndex(null); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartPeriod === 'weekly' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Haftalık
                  </button>
                  <button
                    onClick={() => { setChartPeriod('monthly'); setHoveredIndex(null); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartPeriod === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Aylık
                  </button>
                </div>
              </div>
            </div>

            {/* Chart SVG */}
            <div className="h-80 md:h-[420px] w-full relative group">
              {chartData.length > 0 ? (
                (() => {
                  // Para birimine göre dönüştürülmüş noktalar
                  const convertedPoints = chartData.map(d => ({
                    name: d.name,
                    revenue: convert(d.revenue),
                    profit: convert(d.profit)
                  }));

                  // Maksimum ve minimum değerleri bul (zarar absolute/pozitif yukarıda görünecek, skala en yüksek kâr veya zarar ayarlanacak)
                  const maxVal = Math.max(...convertedPoints.map(d => Math.abs(d.profit))) || 100;
                  const minVal = 0;

                  // Üst boşluk ekle (%5 padding)
                  const padding = maxVal * 0.05 || 10;
                  const yMax = maxVal + padding;
                  const yMin = 0;
                  const yRange = yMax - yMin;

                  // Koordinat eşleme fonksiyonları (Genişlik: 800, Yükseklik: 420)
                  const leftPadding = 70;
                  const rightPadding = 30;
                  const topPadding = 10;
                  const bottomPadding = 30;
                  const drawWidth = 800 - leftPadding - rightPadding;
                  const drawHeight = 420 - topPadding - bottomPadding;

                  const getY = (v: number) => topPadding + drawHeight * (1 - (v - yMin) / yRange);
                  const yZero = getY(0);

                  // Kılavuz çizgileri
                  const getGridLines = () => {
                    if (minVal < 0) {
                      return [maxVal, maxVal / 2, 0, minVal / 2, minVal];
                    } else {
                      return [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0];
                    }
                  };
                  const gridLines = getGridLines();

                  // Sütun genişliği belirle
                  const colWidth = chartPeriod === 'daily' ? 22 : chartPeriod === 'weekly' ? 30 : 40;

                  // Net Kâr/Zarar çizgisi için path oluştur
                  const linePath = convertedPoints.map((d, i) => {
                    const x = leftPadding + (i / (convertedPoints.length - 1 || 1)) * drawWidth;
                    const y = getY(Math.abs(d.profit));
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ');

                  // Tooltip Stili
                  let tooltipStyle: React.CSSProperties = {
                    position: 'absolute',
                    pointerEvents: 'none',
                    zIndex: 50,
                    width: '210px',
                  };

                  if (hoveredIndex !== null && convertedPoints[hoveredIndex]) {
                    const activeY = getY(Math.abs(convertedPoints[hoveredIndex].profit));
                    tooltipStyle.top = `${Math.max(10, activeY - 140)}px`;
                    if (hoveredIndex === 0) {
                      tooltipStyle.left = `${leftPadding + 10}px`;
                    } else if (hoveredIndex === convertedPoints.length - 1) {
                      tooltipStyle.right = `${rightPadding + 10}px`;
                    } else {
                      const activeX = leftPadding + (hoveredIndex / (convertedPoints.length - 1 || 1)) * drawWidth;
                      tooltipStyle.left = `${activeX - 105}px`;
                    }
                  }

                  return (
                    <>
                      <svg
                        className="w-full h-full overflow-visible"
                        viewBox="0 0 800 420"
                      >
                        <defs>
                          <linearGradient id="greenGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
                          </linearGradient>
                          <linearGradient id="redGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.3" />
                          </linearGradient>
                          <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#4b41e1" floodOpacity="0.2" />
                          </filter>
                        </defs>

                        {/* Kılavuz Çizgileri ve Sol Y Ekseni Etiketleri */}
                        {gridLines.map((v, idx) => {
                          const y = getY(v);
                          return (
                            <g key={idx}>
                              <line
                                x1={leftPadding}
                                y1={y}
                                x2={800 - rightPadding}
                                y2={y}
                                stroke={v === 0 ? "#64748b" : undefined}
                                className={v === 0 ? "" : "stroke-slate-300 dark:stroke-slate-800/80"}
                                strokeWidth={v === 0 ? "1.5" : "1"}
                                strokeDasharray={v === 0 ? undefined : "3 3"}
                              />
                              <text
                                x={10}
                                y={y + 4}
                                textAnchor="start"
                                className="text-[10px] font-extrabold text-slate-400 select-none fill-current"
                              >
                                {v === 0 ? "0" : fmt(Math.round(v), viewCurrency).split(',')[0]}
                              </text>
                            </g>
                          );
                        })}

                        {/* Net Kâr/Zarar Sütunları */}
                        {convertedPoints.map((d, i) => {
                          const x = leftPadding + (i / (convertedPoints.length - 1 || 1)) * drawWidth;
                          
                          if (d.profit >= 0) {
                            const yVal = getY(d.profit);
                            const height = yZero - yVal;
                            if (height <= 0) return null;
                            const r = Math.min(6, height);
                            // Rounded top corners
                            const path = `M ${x - colWidth/2} ${yZero} 
                                          L ${x - colWidth/2} ${yVal + r} 
                                          A ${r} ${r} 0 0 1 ${x - colWidth/2 + r} ${yVal} 
                                          L ${x + colWidth/2 - r} ${yVal} 
                                          A ${r} ${r} 0 0 1 ${x + colWidth/2} ${yVal + r} 
                                          L ${x + colWidth/2} ${yZero} Z`;
                            return (
                              <path
                                key={i}
                                d={path}
                                fill="url(#greenGradient)"
                                className="transition-all duration-200 hover:opacity-90"
                              />
                            );
                          } else {
                            const yVal = getY(Math.abs(d.profit));
                            const height = yZero - yVal;
                            if (height <= 0) return null;
                            const r = Math.min(6, height);
                            // Rounded top corners (upward red column for loss)
                            const path = `M ${x - colWidth/2} ${yZero} 
                                          L ${x - colWidth/2} ${yVal + r} 
                                          A ${r} ${r} 0 0 1 ${x - colWidth/2 + r} ${yVal} 
                                          L ${x + colWidth/2 - r} ${yVal} 
                                          A ${r} ${r} 0 0 1 ${x + colWidth/2} ${yVal + r} 
                                          L ${x + colWidth/2} ${yZero} Z`;
                            return (
                              <path
                                key={i}
                                d={path}
                                fill="url(#redGradient)"
                                className="transition-all duration-200 hover:opacity-90"
                              />
                            );
                          }
                        })}

                        {/* Brüt Satış Trend Çizgisi */}
                        {convertedPoints.length > 1 && (
                          <path
                            d={linePath}
                            fill="none"
                            stroke="#4b41e1"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#shadow)"
                          />
                        )}

                         {/* Trend Çizgisi Düğümleri */}
                        {convertedPoints.map((d, i) => {
                          const x = leftPadding + (i / (convertedPoints.length - 1 || 1)) * drawWidth;
                          const y = getY(Math.abs(d.profit));
                          const isHovered = hoveredIndex === i;
                          return (
                            <g key={i}>
                              {/* Dış Parlama Efekti (Hover durumunda) */}
                              {isHovered && (
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="13"
                                  fill="#4b41e1"
                                  opacity="0.15"
                                  className="animate-ping"
                                />
                              )}
                              {/* Görsel Düğüm Noktası */}
                              <circle
                                cx={x}
                                cy={y}
                                r={isHovered ? "7" : "5"}
                                fill="#ffffff"
                                stroke="#4b41e1"
                                strokeWidth={isHovered ? "4" : "3"}
                                className="transition-all duration-150 shadow-md"
                              />
                              {/* İnteraktif Geniş Alan Tetikleyicisi (Görünmez Düğüm) */}
                              <circle
                                cx={x}
                                cy={y}
                                r="20"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                              />
                            </g>
                          );
                        })}

                        {/* X Ekseni Etiketleri */}
                        {convertedPoints.map((d, i) => {
                          const x = leftPadding + (i / (convertedPoints.length - 1 || 1)) * drawWidth;
                          return (
                            <text
                              key={i}
                              x={x}
                              y={412}
                              textAnchor="middle"
                              className="text-[10px] font-extrabold text-slate-400 select-none fill-current uppercase tracking-widest"
                            >
                              {d.name}
                            </text>
                          );
                        })}
                      </svg>

                      {/* İnteraktif Tooltip */}
                      {hoveredIndex !== null && convertedPoints[hoveredIndex] && (
                        <div
                          className="absolute bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800 pointer-events-none z-30 transition-all duration-100 animate-in fade-in zoom-in-95"
                          style={tooltipStyle}
                        >
                          <div className="text-xs font-black text-white/90 mb-2 border-b border-slate-800 pb-1">
                            {convertedPoints[hoveredIndex].name}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs gap-6">
                              <span className="text-slate-400 font-bold">Brüt Satış:</span>
                              <span className="text-indigo-300 font-black">
                                {fmt(convertedPoints[hoveredIndex].revenue, viewCurrency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs gap-6">
                              <span className="text-slate-400 font-bold">Maliyet (COGS):</span>
                              <span className="text-slate-300 font-black">
                                {fmt(convertedPoints[hoveredIndex].revenue - convertedPoints[hoveredIndex].profit, viewCurrency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800 gap-6">
                              <span className="text-slate-400 font-bold">Net Kâr/Zarar:</span>
                              <span className={`font-black px-2 py-0.5 rounded-md ${convertedPoints[hoveredIndex].profit >= 0 ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                                {convertedPoints[hoveredIndex].profit >= 0 ? '+' : ''}
                                {fmt(convertedPoints[hoveredIndex].profit, viewCurrency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <div className="animate-pulse flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    <span>Grafik verileri oluşturuluyor...</span>
                  </div>
                </div>
              )}
            </div>


          </div>

          {/* Recent Activity Table */}
          <div className="bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                <h2 className="text-xl font-bold text-on-surface">Son Aktiviteler</h2>
              </div>
              <button className="text-primary text-sm font-bold hover:underline">
                Tümünü Gör
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      İşlem
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(activity.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">
                              package_2
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {activity.product_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {activity.operation_type === 'stock_in'
                          ? `Stok Girişi (+${activity.quantity})`
                          : activity.operation_type === 'sale'
                            ? `Satış (-${activity.quantity})`
                            : `İade (+${activity.quantity})`}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-[11px] font-bold rounded-full ${getStatusColor(activity.status).bg} ${getStatusColor(activity.status).text}`}
                        >
                          {getStatusLabel(activity.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Secondary Panel */}
        <div className="space-y-8">
          {/* Stock Health Card */}
          <div className="bg-primary p-8 rounded-3xl text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Stok Sağlığı</h3>
              <p className="text-primary-fixed/80 text-sm mb-6">
                Stok sağlığı yüzde {kpiData.stockHealth}. En çok satan ürünleri yeniden
                stoklamayı düşünün.
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-widest opacity-80">
                    <span>Optimal Stok</span>
                    <span>{kpiData.stockHealth}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-500"
                      style={{ width: `${kpiData.stockHealth}%` }}
                    ></div>
                  </div>
                </div>
                <button className="w-full py-3 bg-white text-primary rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors mt-4">
                  Optimizasyonu Çalıştır
                </button>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
          </div>

          {/* Aktivite Geçmişi (audit log) */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm lg:!mt-16">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                <h2 className="text-lg font-bold text-on-surface">İşlem Geçmişi</h2>
              </div>
              <Link href="/activity-log" className="text-primary text-xs font-bold hover:underline">
                Tümü
              </Link>
            </div>
            <ActivityLogList logs={activityLogs} compact emptyMessage="Henüz işlem yok" />
          </div>

          {/* Category Breakdown */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-on-surface">Ürün Dağılımı</h2>
              <span className="material-symbols-outlined text-slate-400">more_horiz</span>
            </div>
            <div className="space-y-4">
              {categories && categories.length > 0 ? (
                categories.map((product, index) => {
                  const colorClasses = [
                    'bg-primary',
                    'bg-secondary',
                    'bg-tertiary',
                  ];
                  return (
                    <Link key={product.id} href={`/inventory/${product.id}`}>
                      <div className="flex items-center gap-4 hover:bg-slate-50/50 p-2 rounded-lg transition-colors cursor-pointer">
                        <div className={`w-2.5 h-2.5 rounded-full ${colorClasses[index] || 'bg-primary'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{product.name || 'Ürün'}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {(product.totalProducts || 0).toLocaleString('tr-TR')} Adet Stok
                          </p>
                        </div>
                        <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                          {fmt(convert(product.totalValue || 0), viewCurrency)}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">Ürün verisi bulunamadı</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Toplam Stok Değeri
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {fmt(convert(
                    categories && categories.length > 0 
                      ? categories.reduce((sum, p) => sum + (p.totalValue || 0), 0)
                      : 0
                  ), viewCurrency)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-slate-900 h-full w-[60%]"></div>
              </div>
            </div>
          </div>

          {/* Top Vendors */}
          <div className="bg-surface-container-low rounded-3xl p-6">
            <h2 className="text-lg font-bold text-on-surface mb-4">En İyi Tedarikçiler</h2>
            <div className="grid grid-cols-2 gap-3">
              {vendors.length > 0 ? (
                vendors.map((vendor, index) => (
                  <div key={vendor.id} className="bg-white p-4 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-primary">
                        {index === 0 ? 'business' : 'apartment'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{vendor.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{vendor.type}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6">
                  <p className="text-sm text-slate-500">Tedarikçi verisi bulunamadı</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-container-high px-6 h-20 flex items-center justify-between z-50">
        <Link href="/dashboard" className="text-primary flex flex-col items-center gap-0.5">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            dashboard
          </span>
          <span className="text-[10px] font-bold">Panel</span>
        </Link>
        <Link href="/inventory" className="text-on-surface-variant flex flex-col items-center gap-0.5">
          <span className="material-symbols-outlined">inventory_2</span>
          <span className="text-[10px] font-bold">Stok</span>
        </Link>
        <Link href="/invoices/new" className="text-on-surface-variant flex flex-col items-center gap-0.5">
          <span className="material-symbols-outlined">add_circle</span>
          <span className="text-[10px] font-bold">Ekle</span>
        </Link>
        <Link href="/reports" className="text-on-surface-variant flex flex-col items-center gap-0.5">
          <span className="material-symbols-outlined">analytics</span>
          <span className="text-[10px] font-bold">Raporlar</span>
        </Link>
        <Link href="/settings" className="text-on-surface-variant flex flex-col items-center gap-0.5">
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[10px] font-bold">Ayarlar</span>
        </Link>
      </nav>
    </div>
  );
}
