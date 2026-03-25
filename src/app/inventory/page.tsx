"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CategoryModal from "@/components/inventory/CategoryModal";
import Link from "next/link";

// ─── Tipler ────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  sku: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  critical_limit: number;
  categories: { name: string }[] | null;
}

interface Stats {
  totalProducts: number;
  lowStockCount: number;
  totalStockValue: number;
  invoiceCount: number;
}

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────

function getStockLevel(qty: number, limit: number): "high" | "low" | "critical" {
  if (qty <= limit) return "critical";
  if (qty <= limit * 3) return "low";
  return "high";
}

function getBarColor(level: "high" | "low" | "critical"): string {
  if (level === "critical") return "bg-error";
  if (level === "low") return "bg-amber-500";
  return "bg-emerald-500";
}

function getTextColor(level: "high" | "low" | "critical"): string {
  if (level === "critical") return "text-error";
  if (level === "low") return "text-amber-600";
  return "text-emerald-600";
}

function getStockPercent(qty: number, limit: number): number {
  // Görsel çubuk: critical_limit * 5 = "doluluğun 100%'i" olarak kabul edilir
  const max = Math.max(limit * 5, qty, 1);
  return Math.min(Math.round((qty / max) * 100), 100);
}

function formatPrice(val: number): string {
  return (
    "₺" +
    val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

// ─── Yükleme Skeleton ───────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-slate-100 rounded-full w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Sayfa Bileşeni ─────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [criticalItems, setCriticalItems] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const router = useRouter();

  // ── Veri Çekme ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, sku, name, purchase_price, sale_price, stock_quantity, critical_limit, categories(name)")
        .order("name");

      if (productError) throw productError;
      const prods = (productData ?? []) as Product[];
      const criticals = prods.filter((p) => p.stock_quantity <= p.critical_limit);
      const totalStockValue = prods.reduce((sum, p) => sum + p.stock_quantity * p.purchase_price, 0);
      const { count: invoiceCount } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true });

      setProducts(prods);
      setFiltered(prods);
      setCriticalItems(criticals);
      setStats({
        totalProducts: prods.length,
        lowStockCount: criticals.length,
        totalStockValue,
        invoiceCount: invoiceCount ?? 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        // 1. Ürünler + kategori join
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, sku, name, purchase_price, sale_price, stock_quantity, critical_limit, categories(name)")
          .order("name");

        if (productError) throw productError;
        const prods = (productData ?? []) as Product[];

        // 2. İnsights: kritik limit altındaki ürünler
        const criticals = prods.filter((p) => p.stock_quantity <= p.critical_limit);

        // 3. İstatistikler
        const totalStockValue = prods.reduce(
          (sum, p) => sum + p.stock_quantity * p.purchase_price,
          0
        );

        // 4. Fatura sayısı (aylık sirkülasyon için basit count)
        const { count: invoiceCount } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true });

        setProducts(prods);
        setFiltered(prods);
        setCriticalItems(criticals);
        setStats({
          totalProducts: prods.length,
          lowStockCount: criticals.length,
          totalStockValue,
          invoiceCount: invoiceCount ?? 0,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  // ── Anlık Arama & Filtre ────────────────────────────────────────────────
  useEffect(() => {
    let result = [...products];

    // Metin araması
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    // Stok durumu filtresi
    if (stockFilter === "ok") {
      result = result.filter((p) => p.stock_quantity > p.critical_limit * 3);
    } else if (stockFilter === "low") {
      result = result.filter(
        (p) => p.stock_quantity > p.critical_limit && p.stock_quantity <= p.critical_limit * 3
      );
    } else if (stockFilter === "critical") {
      result = result.filter((p) => p.stock_quantity <= p.critical_limit);
    }

    setFiltered(result);
  }, [search, stockFilter, products]);

  // ── Hata Durumu ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-xl font-extrabold text-on-surface">Veri yüklenemedi</h2>
        <p className="text-slate-500 text-sm max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-on-primary px-5 py-2 rounded-xl font-bold text-sm hover:bg-primary-container transition-all"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  // ── Sayfa İçeriği ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-10 space-y-8">

      {/* ── Sayfa Başlığı ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
            <span>Panel</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-slate-500">Stok Yönetimi</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            Stok Kontrol Paneli
          </h1>
          <p className="text-slate-500 mt-1">
            Envanter durumunu izleyin, stok seviyelerini yönetin ve ürünlerinizi organize edin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="border border-primary text-primary px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">create_new_folder</span>
            <span>+ Kategori Ekle</span>
          </button>
          <button
            onClick={() => router.push("/inventory/new")}
            className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-primary-container transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add_box</span>
            <span>+ Yeni Ürün Ekle</span>
          </button>
        </div>
      </div>

      {/* ── Bento İstatistik Kartları ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Toplam Ürün */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <span className="material-symbols-outlined">inventory</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-500">Toplam Ürün</p>
          <h3 className="text-2xl font-black text-indigo-900">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" />
            ) : (
              stats?.totalProducts.toLocaleString("tr-TR") ?? "—"
            )}
          </h3>
        </div>

        {/* Azalan / Kritik Stoklar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <span className="material-symbols-outlined">warning</span>
            </div>
            {!loading && stats && stats.lowStockCount > 0 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Kritik
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-500">Azalan Stoklar</p>
          <h3 className="text-2xl font-black text-indigo-900">
            {loading ? (
              <span className="inline-block w-12 h-7 bg-slate-100 rounded animate-pulse" />
            ) : (
              stats?.lowStockCount ?? "—"
            )}
          </h3>
        </div>

        {/* Stok Değeri */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-500">Stok Değeri</p>
          <h3 className="text-2xl font-black text-indigo-900">
            {loading ? (
              <span className="inline-block w-28 h-7 bg-slate-100 rounded animate-pulse" />
            ) : (
              formatPrice(stats?.totalStockValue ?? 0)
            )}
          </h3>
        </div>

        {/* Aylık Sirkülasyon (Fatura Sayısı) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
              <span className="material-symbols-outlined">sync</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-500">Toplam Fatura</p>
          <h3 className="text-2xl font-black text-indigo-900">
            {loading ? (
              <span className="inline-block w-12 h-7 bg-slate-100 rounded animate-pulse" />
            ) : (
              stats?.invoiceCount.toLocaleString("tr-TR") ?? "—"
            )}
          </h3>
        </div>
      </div>

      {/* ── Envanter Tablosu ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-50/50">

        {/* Filtre Araç Çubuğu */}
        <div className="p-4 md:p-6 bg-surface-container-low/30 border-b border-indigo-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Arama */}
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-indigo-100 focus:ring-2 focus:ring-primary focus:border-transparent text-sm outline-none"
                placeholder="Ürün adı veya SKU ile ara..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filtreler */}
            <div className="flex items-center gap-2">
              <select
                className="bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Kategori: Tümü</option>
                {/* Kategori seçenekleri veriden üretilecek — şimdilik tümü */}
              </select>
              <select
                className="bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <option value="all">Stok Durumu: Tümü</option>
                <option value="ok">Stokta Var</option>
                <option value="low">Azalıyor</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl border border-indigo-50 transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl border border-indigo-100 transition-colors">
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>

        {/* Veri Tablosu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ürün Adı &amp; SKU
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mevcut Stok
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Birim Fiyat
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-slate-300 text-5xl block mb-3">
                      search_off
                    </span>
                    <p className="text-slate-400 font-semibold">Ürün bulunamadı</p>
                    <p className="text-slate-300 text-sm mt-1">Arama kriterlerinizi değiştirin</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const level = getStockLevel(item.stock_quantity, item.critical_limit);
                  const percent = getStockPercent(item.stock_quantity, item.critical_limit);
                  const categoryName = item.categories?.[0]?.name ?? "—";

                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors group">
                      {/* Ürün Adı & SKU */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Ürün görseli yoksa harf avatar */}
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex-shrink-0 flex items-center justify-center">
                            <span className="text-indigo-600 font-black text-base">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <Link href={`/inventory/${item.id}`} className="font-bold text-on-surface hover:text-primary transition-colors">{item.name}</Link>
                            <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-surface-container-high text-indigo-700 rounded-full text-[11px] font-bold">
                          {categoryName}
                        </span>
                      </td>

                      {/* Mevcut Stok */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`${getBarColor(level)} h-full rounded-full transition-all`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${getTextColor(level)}`}>
                            {item.stock_quantity} Adet
                          </span>
                        </div>
                      </td>

                      {/* Birim Fiyat */}
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-on-surface">{formatPrice(item.sale_price)}</p>
                      </td>

                      {/* İşlemler */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push(`/inventory/${item.id}/edit`)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button className="p-2 text-error hover:bg-error-container/20 rounded-lg">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="p-6 bg-surface-container-low/30 border-t border-indigo-50 flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">
            Toplam{" "}
            <span className="text-indigo-900 font-bold">
              {(stats?.totalProducts ?? 0).toLocaleString("tr-TR")}
            </span>{" "}
            üründen{" "}
            <span className="text-indigo-900 font-bold">{filtered.length}</span>{" "}
            tanesi gösteriliyor
          </p>
          <div className="flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-sm">
              1
            </button>
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Kritik Stok Uyarıları & Kategori Dağılımı ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Kritik Stok Uyarıları */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-indigo-50/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-extrabold text-on-surface">Kritik Stok Uyarıları</h4>
            <button className="text-indigo-600 text-sm font-bold hover:underline">
              Tümünü Gör
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-slate-50 rounded-xl" />
                <div className="h-16 bg-slate-50 rounded-xl" />
              </div>
            ) : criticalItems.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-emerald-400 text-4xl block mb-2">
                  check_circle
                </span>
                <p className="text-slate-400 text-sm font-semibold">Tüm stoklar yeterli seviyede</p>
              </div>
            ) : (
              criticalItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-error-container/10 border border-error-container/30"
                >
                  <span
                    className="material-symbols-outlined text-error"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    error
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Kritik seviyenin altında (Mevcut: {item.stock_quantity}, Limit: {item.critical_limit})
                    </p>
                  </div>
                  <button className="bg-error text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm flex-shrink-0">
                    Sipariş Ver
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kategori Dağılımı (statik bant görsel) */}
        <div className="bg-primary-container rounded-2xl p-6 text-on-primary-container flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-lg font-extrabold mb-1">Kategori Dağılımı</h4>
            <p className="text-xs opacity-80 mb-6">Envanter hacmi analizi</p>
            <div className="space-y-4">
              {[
                { label: "Elektronik", percent: 42 },
                { label: "Mobilya", percent: 28 },
                { label: "Diğer", percent: 30 },
              ].map(({ label, percent }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] font-bold mb-1 uppercase tracking-wider">
                    <span>{label}</span>
                    <span>%{percent}</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="bg-white h-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-20 transform -rotate-12">
            <span
              className="material-symbols-outlined text-[160px]"
              style={{ fontVariationSettings: "'wght' 700" }}
            >
              pie_chart
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="p-6 text-center border-t border-indigo-50/50">
        <p className="text-slate-400 text-xs font-medium">
          © 2024 KOBİ Muhasebe &amp; Ekosistem. Tüm hakları saklıdır. Version 2.4.0
        </p>
      </footer>

      {/* ── Kategori Ekleme Modalı ── */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={fetchAll}
      />
    </div>
  );
}
