'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

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

export default function DashboardPage() {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalProducts: 0,
    criticalStockItems: 0,
    todayRevenue: 0,
    stockHealth: 0,
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          toast.error('Oturum açmanız gereklidir');
          return;
        }
        setUser(authUser);

        const [
          productsRes,
          revenueRes,
          activitiesRes,
        ] = await Promise.all([
          supabase
            .from('products')
            .select('id, name, stock_quantity, critical_limit')
            .eq('user_id', authUser.id),

          supabase
            .from('invoices')
            .select('total_amount')
            .eq('user_id', authUser.id),

          supabase
            .from('inventory_logs')
            .select(`
              id,
              operation_type,
              quantity,
              created_at,
              products (
                name
              )
            `)
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const allProducts = productsRes.data || [];
        const totalProducts = allProducts.length;

        const criticalCount = allProducts.filter(
          (p) => p.stock_quantity <= (p.critical_limit || 10)
        ).length;

        let totalRevenue = 0;
        if (revenueRes.data) {
          totalRevenue = revenueRes.data.reduce(
            (sum, inv) => sum + (inv.total_amount || 0),
            0
          );
        }

        let processedActivities: ActivityLog[] = [];
        if (activitiesRes.data) {
          processedActivities = activitiesRes.data
            .filter((log: any) => log && log.id)
            .map((log: any) => ({
              id: log.id,
              product_name: log.products?.name || log.product_name || 'Ürün',
              operation_type: log.operation_type || 'unknown',
              quantity: log.quantity || 0,
              created_at: log.created_at || new Date().toISOString(),
              status: getActivityStatus(log.operation_type),
            }));
        }

        const nonCriticalProducts = totalProducts - criticalCount;
        const stockHealth =
          totalProducts > 0
            ? Math.round((nonCriticalProducts / totalProducts) * 100)
            : 0;

        const chartPoints = generateChartData();

        setKpiData({
          totalProducts,
          criticalStockItems: criticalCount,
          todayRevenue: totalRevenue,
          stockHealth,
        });
        setActivities(processedActivities);
        setChartData(chartPoints);
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
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getActivityStatus = (type: string) => {
    if (type === 'stock_in') return 'completed' as const;
    if (type === 'sale') return 'completed' as const;
    if (type === 'return') return 'pending' as const;
    return 'delayed' as const;
  };

  const generateChartData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const baseRevenue = Math.random() * 5000 + 10000;

    for (let i = 0; i < 7; i++) {
      data.push({
        name: days[i],
        revenue: Math.round(baseRevenue + Math.random() * 3000),
        profit: Math.round(baseRevenue * 0.4 + Math.random() * 1500),
      });
    }
    return data;
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
    <div className="space-y-8 pb-24 md:pb-0">
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
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border-none rounded-xl text-sm font-semibold text-slate-600 shadow-sm hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[18px]">
              calendar_today
            </span>
            Son 30 Gün
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Raporu Dışa Aktar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-fixed text-primary rounded-lg">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
              +12%
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Toplam Ürün
          </p>
          <h3 className="text-2xl font-extrabold mt-1 text-slate-900">
            {kpiData.totalProducts.toLocaleString('tr-TR')}
          </h3>
        </div>

        {/* Critical Stock Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-error-container text-error rounded-lg">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
              Dikkat
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Kritik Stok Ürünleri
          </p>
          <h3 className="text-2xl font-extrabold mt-1 text-slate-900">
            {kpiData.criticalStockItems}
          </h3>
        </div>

        {/* Today's Revenue Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-secondary-container text-secondary rounded-lg">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
              Bugün
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Günlük Satış Cirosu
          </p>
          <h3 className="text-2xl font-extrabold mt-1 text-slate-900">
            ₺{kpiData.todayRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        {/* Recent Transactions Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-fixed text-tertiary rounded-lg">
              <span className="material-symbols-outlined">history</span>
            </div>
            <span className="text-xs font-bold text-slate-400">Son 24h</span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Son İşlemler
          </p>
          <h3 className="text-2xl font-extrabold mt-1 text-slate-900">
            {activities.length}
          </h3>
        </div>
      </div>

      {/* Bento Layout Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Trends Chart */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                <h2 className="text-xl font-bold text-on-surface">Satış Trendleri</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-4">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-xs font-medium text-slate-500">Brüt Satış</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-primary-fixed-dim"></div>
                  <span className="text-xs font-medium text-slate-500">Net Kar</span>
                </div>
              </div>
            </div>

            {/* Chart SVG */}
            <div className="h-64 w-full relative group">
              <svg
                className="w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 1000 300"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#4b41e1" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#4b41e1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,250 L100,220 L200,240 L300,180 L400,210 L500,140 L600,160 L700,90 L800,120 L900,60 L1000,80"
                  fill="none"
                  stroke="#4b41e1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
                <path
                  d="M0,250 L100,220 L200,240 L300,180 L400,210 L500,140 L600,160 L700,90 L800,120 L900,60 L1000,80 V300 H0 Z"
                  fill="url(#chartGradient)"
                />
                <circle cx="500" cy="140" fill="#4b41e1" r="6" stroke="white" strokeWidth="2" />
                <circle cx="700" cy="90" fill="#4b41e1" r="6" stroke="white" strokeWidth="2" />
                <circle cx="900" cy="60" fill="#4b41e1" r="6" stroke="white" strokeWidth="2" />
              </svg>
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                <div className="border-b border-slate-900 w-full h-px"></div>
                <div className="border-b border-slate-900 w-full h-px"></div>
                <div className="border-b border-slate-900 w-full h-px"></div>
                <div className="border-b border-slate-900 w-full h-px"></div>
              </div>
            </div>

            <div className="flex justify-between mt-6 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Pzt</span>
              <span>Sal</span>
              <span>Çar</span>
              <span>Per</span>
              <span>Cum</span>
              <span>Cmt</span>
              <span>Paz</span>
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

          {/* Category Breakdown */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-on-surface">Kategori Dağılımı</h2>
              <span className="material-symbols-outlined text-slate-400">more_horiz</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Elektronik</p>
                  <p className="text-[11px] text-slate-500 font-medium">425 Ürün</p>
                </div>
                <span className="text-sm font-bold text-slate-700">₺52.4k</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Ofis Malzemeleri</p>
                  <p className="text-[11px] text-slate-500 font-medium">1,120 Ürün</p>
                </div>
                <span className="text-sm font-bold text-slate-700">₺18.2k</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-tertiary"></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Mobilya</p>
                  <p className="text-[11px] text-slate-500 font-medium">84 Ürün</p>
                </div>
                <span className="text-sm font-bold text-slate-700">₺24.9k</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Kullanılan Depolama
                </span>
                <span className="text-xs font-bold text-slate-900">1.2 / 2.0 TB</span>
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
              <div className="bg-white p-4 rounded-2xl flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-primary">business</span>
                </div>
                <p className="text-xs font-bold text-slate-900">TechFlow Inc</p>
                <p className="text-[10px] text-slate-500 mt-1">Tier 1 Partner</p>
              </div>
              <div className="bg-white p-4 rounded-2xl flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-primary">apartment</span>
                </div>
                <p className="text-xs font-bold text-slate-900">LuxeLiving</p>
                <p className="text-[10px] text-slate-500 mt-1">Tier 1 Partner</p>
              </div>
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
