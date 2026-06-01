"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import StockAdjustmentModal from "@/components/inventory/StockAdjustmentModal";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import CurrencySwitcher from "@/components/common/CurrencySwitcher";
import { parseDescription } from "@/lib/productImageHelper";
import { usePermissions } from "@/hooks/usePermissions";

// ─── Tipler ────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  purchase_price: number;
  sale_price: number;
  currency: string;
  purchase_price_in_currency: number;
  sale_price_in_currency: number;
  stock_quantity: number;
  critical_limit: number;
  tax_rate: number;
  categories: ({ name: string } | { name: string }[]) | null; // ✅ Dizi veya tek nesne
}

interface StockMovement {
  id: string;
  date: string;       // ISO string
  type: string;       // Faturadan gelen type VEYA inventory_logs'tan action_type
  quantity: number;   // Faturadaki quantity VEYA inventory_logs'tan quantity_change
  unit_price: number | null; // inventory_logs'tan unit_price (işlem anındaki fiyat)
  notes: string | null;
}

interface InventoryLog {
  id: string;
  product_id: string;
  action_type: string;
  quantity_change: number;
  previous_stock: number | null;
  new_stock: number | null;
  unit_price: number | null;
  note: string | null;
  created_at: string;
}

// ✅ YENİ: Tüm log verilerini client-side pagination için tut
interface AllMovements {
  data: StockMovement[];
  total: number;
}

// ─── Yardımcılar ────────────────────────────────────────────────────────────

// fmt function is now handled by the hook

function fmtDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function MovementBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; icon: string; cls: string }> = {
    // Eski invoice_items tipleri
    sale:       { label: "Satış",       icon: "trending_down",          cls: "bg-emerald-50 text-emerald-700" },
    purchase:   { label: "Alış",        icon: "add_shopping_cart",      cls: "bg-indigo-50 text-indigo-700" },
    return:     { label: "İade",        icon: "settings_backup_restore", cls: "bg-red-50 text-red-700" },
    adjustment: { label: "Stok Sayımı", icon: "inventory",              cls: "bg-amber-50 text-amber-700" },
    
    // ✅ YENİ: inventory_logs tipleri
    "Artır":    { label: "Stok Artırıldı",  icon: "add_circle",  cls: "bg-emerald-50 text-emerald-700" },
    "Azalt":    { label: "Stok Azaltıldı",  icon: "remove_circle", cls: "bg-red-50 text-red-700" },
    "Güncelleme": { label: "Ürün Güncellendi", icon: "edit", cls: "bg-blue-50 text-blue-700" },
  };
  const t = map[type] ?? { label: type, icon: "swap_vert", cls: "bg-slate-50 text-slate-700" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${t.cls}`}>
      <span className="material-symbols-outlined text-sm">{t.icon}</span>
      {t.label}
    </span>
  );
}

// ─── Sayfa Bileşeni ─────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { hasPermission } = usePermissions();

  const [product, setProduct] = useState<Product | null>(null);
  const [allMovements, setAllMovements] = useState<AllMovements>({ data: [], total: 0 }); // ✅ TÜM VERİ BİR KEREDE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 5; // Client-side pagination için

  // Döviz Durumu
  const { rates, viewCurrency, setViewCurrency, convert, convertFull, format: fmt } = useCurrencyConverter();

  // ── Kullanıcı ID'sini Al ────────────────────────────────────────────────
  useEffect(() => {
    async function getUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setError("Kullanıcı oturum açmamış.");
        return;
      }
      setUserId(user.id);
    }
    getUser();
  }, []);

  // ✅ TAZELENME: Verileri sunucudan çek ve client-side pagination ile göster
  const updateProductData = useCallback(async () => {
    if (!id || !userId) return;

    try {
      const { fetchTeamScopedData } = await import("@/app/(dashboard)/teamActions");

      const { data: prodData } = await fetchTeamScopedData(
        userId,
        "products",
        "id, sku, name, description, purchase_price, sale_price, currency, purchase_price_in_currency, sale_price_in_currency, stock_quantity, critical_limit, tax_rate, categories(name)",
        {
          additionalFilters: [{ column: "id", operator: "eq", value: id }],
          limit: 1
        }
      );

      const prod = prodData && prodData.length > 0 ? prodData[0] : null;

      if (!prod) {
        throw new Error("Ürün bulunamadı veya erişim izniniz yok.");
      }

      setProduct(prod as Product);
      console.log("✅ Ürün verisi tazelendi:", prod);

      // 2. TÜM inventory_logs'u çek (20-30 kaydı bir seferde)
      const { data: logs, count: totalCount } = await fetchTeamScopedData(
        userId,
        "inventory_logs",
        "id, product_id, action_type, quantity_change, previous_stock, new_stock, note, unit_price, created_at",
        {
          additionalFilters: [{ column: "product_id", operator: "eq", value: id }],
          orderBy: "created_at",
          orderAscending: false,
          limit: 30
        }
      );

      if (logs && logs.length > 0) {
        const mapped: StockMovement[] = logs.map((log: InventoryLog) => ({
          id: log.id,
          date: log.created_at,
          type: log.action_type,
          quantity: Math.abs(log.quantity_change),
          unit_price: log.unit_price ?? null,
          notes: log.note,
        }));
        setAllMovements({ data: mapped, total: totalCount || 0 });
        setCurrentPage(0); // ✅ Sayfayı 0'a dön
        console.log("✅ Inventory logs tazelendi:", mapped.length, "kayıt yüklendi");
      } else {
        console.warn("⚠️ inventory_logs bulunamadı, fallback yapılıyor...");
        // Fallback: Eski fatura verilerinden göster
        const { data: items, count: itemCount } = await supabase
          .from("invoice_items")
          .select("id, quantity, unit_price, invoices(id, invoice_date, type, notes)", { count: "exact" })
          .eq("product_id", id)
          .order("id", { ascending: false })
          .limit(30);

        if (items && items.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: StockMovement[] = items.map((row: any) => {
            const inv = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;
            return {
              id: row.id,
              date: inv?.invoice_date ?? new Date().toISOString(),
              type: inv?.type ?? "sale",
              quantity: row.quantity ?? 0,
              unit_price: row.unit_price ?? null,
              notes: inv?.notes ?? null,
            };
          });
          setAllMovements({ data: mapped, total: itemCount || 0 });
          setCurrentPage(0);
        } else {
          setAllMovements({ data: [], total: 0 });
        }
      }

      setError(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Veriler yüklenemedi.";
      console.error("❌ Veri tazeleme hatası:", err);
      setError(errorMsg);
    }
  }, [id, userId]);

  // ✅ MODAL KAPANDIKTAN SONRA: Sayfa anlık güncellenir
  const handleStockUpdateSuccess = useCallback(async () => {
    console.log("✅ Stok işlemi başarılı, veriler tazeleniyor...");
    setIsStockModalOpen(false);
    
    // Sunucudan dinamik veriyi al (Supabase'den tazelenmiş stock_quantity)
    await updateProductData();
    
    // Next.js cache'ini sıfırla
    await router.refresh();
  }, [updateProductData, router]);

  // ✅ İLK YÜKLEMEDE: Ürün ve 30 kaydı bir seferde çek
  useEffect(() => {
    if (!id || !userId) return;

    async function initialize() {
      setLoading(true);
      await updateProductData();
      setLoading(false);
    }

    initialize();
  }, [id, userId, updateProductData]);

  // ── Hesaplamalar ──────────────────────────────────────────────────────────
  // Çevrim Yardımcısı
  // Convert function moved to hook

  const margin =
    product && product.purchase_price > 0
      ? ((product.sale_price - product.purchase_price) / product.purchase_price) * 100
      : 0;

  const totalStockValue = product
    ? product.stock_quantity * product.purchase_price
    : 0;

  // ✅ Kategori adını al (Array veya Single nesne olabilir)
  const categoryName =
    product && product.categories
      ? Array.isArray(product.categories)
        ? product.categories[0]?.name ?? "Kategorisiz"
        : product.categories.name ?? "Kategorisiz"
      : "Kategorisiz";

  const stockLabel =
    product
      ? product.stock_quantity <= product.critical_limit
        ? `${product.stock_quantity} Adet — Kritik`
        : `${product.stock_quantity} Adet — İyi Durumda`
      : "";

  const stockBadgeColor =
    product && product.stock_quantity <= product.critical_limit
      ? "text-error"
      : "text-emerald-600";

  const stockIcon =
    product && product.stock_quantity <= product.critical_limit
      ? "warning"
      : "check_circle";

  // ── Hata Ekranı ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-xl font-extrabold text-on-surface">Ürün bulunamadı</h2>
        <p className="text-slate-500 text-sm max-w-sm">{error}</p>
        <button
          onClick={() => router.push("/inventory")}
          className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
        >
          Stok Listesine Dön
        </button>
      </div>
    );
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto animate-pulse">
        <div className="bg-surface-container-low rounded-3xl p-8 h-48" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-32 border border-indigo-50" />
          ))}
        </div>
        <div className="bg-white rounded-3xl h-64 border border-indigo-50" />
      </div>
    );
  }

  if (!product) return null;

  const parsed = parseDescription(product.description || "");

  // ── Ana İçerik ────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Ekmek Kırıntısı (Breadcrumb) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => router.push("/inventory")}>Envanter</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface font-semibold">Ürün Detayı</span>
        </nav>

        <div className="flex items-center gap-2 bg-white border border-indigo-100 rounded-xl px-4 py-2 shadow-sm self-start md:self-auto">
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
      </div>

      {/* ── Bölüm 1: Ürün Özeti ── */}
      <section className="bg-surface-container-low rounded-3xl p-8 relative overflow-hidden">
        {/* Arka plan dekor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center relative z-10">

          {/* Ürün Avatarı */}
          <div className="w-full lg:w-48 h-48 bg-white rounded-2xl shadow-sm flex-shrink-0 flex items-center justify-center border border-indigo-50/50 overflow-hidden relative">
            {parsed.imageUrl ? (
              <img
                src={parsed.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-indigo-300 font-black text-7xl select-none">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Orta Bilgi */}
          <div className="flex-grow space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-primary tracking-widest uppercase opacity-80">
                SKU: {product.sku}
              </span>
              <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
                {product.name}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-indigo-50 text-sm">
                <span className="material-symbols-outlined text-indigo-500 text-lg">category</span>
                <span className="font-medium text-secondary">{categoryName}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-indigo-50 text-sm">
                <span className={`material-symbols-outlined text-lg ${stockBadgeColor}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {stockIcon}
                </span>
                <span className={`font-medium ${stockBadgeColor}`}>{stockLabel}</span>
              </div>
              {product.tax_rate > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-indigo-50 text-sm">
                  <span className="material-symbols-outlined text-slate-400 text-lg">percent</span>
                  <span className="font-medium text-secondary">KDV %{product.tax_rate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex flex-col gap-3 w-full lg:w-auto flex-shrink-0">
            {hasPermission("stock", "edit") && (
              <button
                onClick={() => router.push(`/inventory/${id}/edit`)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-on-surface font-bold rounded-xl shadow-sm border border-indigo-50 hover:bg-surface-container-low transition-all"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                <span>Ürünü Düzenle</span>
              </button>
            )}
            {hasPermission("stock", "edit") && (
              <button
                onClick={() => setIsStockModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-lg">swap_vert</span>
                <span>Stok Ekle/Çıkar</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Bölüm 2: Finansal Kartlar ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Alış Fiyatı */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-indigo-50 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-primary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Birim Maliyet
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Alış Fiyatı</p>
          <h3 className="text-2xl font-bold tracking-tight text-on-surface">
            {fmt(convert(product.purchase_price), viewCurrency)}
          </h3>
        </div>

        {/* Satış Fiyatı */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-indigo-50 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <span className="material-symbols-outlined">point_of_sale</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Piyasa Değeri
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Satış Fiyatı</p>
          <h3 className="text-2xl font-bold tracking-tight text-on-surface">
            {fmt(convert(product.sale_price), viewCurrency)}
          </h3>
        </div>

        {/* Kâr Marjı */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-indigo-50 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Karlılık
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Kâr Marjı</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-on-surface">
              %{margin.toFixed(1)}
            </h3>
            <span className={`text-xs font-bold ${margin >= 0 ? "text-emerald-600" : "text-error"}`}>
              {margin >= 0 ? "+" : ""}{fmt(convert(product.sale_price - product.purchase_price), viewCurrency)}
            </span>
          </div>
        </div>

        {/* Toplam Stok Değeri */}
        <div className="bg-primary/[0.03] rounded-2xl p-6 border-2 border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary rounded-lg text-white">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Varlık Değeri
            </span>
          </div>
          <p className="text-xs text-primary/70 font-semibold mb-1">Toplam Stok Değeri</p>
          <h3 className="text-2xl font-black tracking-tight text-primary">
            {fmt(convert(totalStockValue), viewCurrency)}
          </h3>
        </div>
      </section>

      {/* ── Bölüm 3: Stok Hareket Geçmişi ── */}
      <section className="bg-white rounded-3xl overflow-hidden border border-indigo-50 shadow-sm">
        <div className="p-6 border-b border-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h3 className="text-lg font-bold text-on-surface">Stok Hareket Geçmişi</h3>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-indigo-50">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-indigo-50">
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>

        {/* ✅ Fixed Table Layout: Sütun genişlikleri sabit, içerik taşmaz */}
        <div ref={tableRef} className={`overflow-x-auto transition-opacity duration-300 min-h-[400px] ${isAnimating ? "opacity-60" : "opacity-100"}`}>
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="w-[140px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Tarih</th>
                <th className="w-[180px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">İşlem Türü</th>
                <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Miktar</th>
                <th className="w-[130px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Birim Fiyat</th>
                <th className="w-auto px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {allMovements.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center align-middle">
                    <span className="material-symbols-outlined text-slate-200 text-5xl block mb-3">
                      history
                    </span>
                    <p className="text-slate-400 font-semibold">Henüz hareket kaydı yok</p>
                    <p className="text-slate-300 text-sm mt-1">
                      Bu ürüne ait stok hareketi oluştuğunda burada görünecek
                    </p>
                  </td>
                </tr>
              ) : (
                // ✅ CLIENT-SIDE PAGINATION: Tüm veriyi slice ile böl
                allMovements.data
                  .slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
                  .map((m) => {
                    const { date, time } = fmtDate(m.date);
                    const isSale = m.type === "sale" || m.type === "Azalt";
                    const isReturn = m.type === "return";
                    const qtySign = isSale ? "-" : "+";
                    const qtyColor = isSale ? "text-error" : "text-emerald-600";

                    return (
                      <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors align-middle">
                        <td className="w-[140px] px-6 py-5 align-middle">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-on-surface">{date}</span>
                            <span className="text-[10px] text-slate-400">{time}</span>
                          </div>
                        </td>
                        <td className="w-[180px] px-6 py-5 align-middle">
                          <MovementBadge type={m.type} />
                        </td>
                        <td className="w-[120px] px-6 py-5 align-middle text-center">
                          {m.type === "adjustment" ? (
                            <span className="text-sm font-bold text-slate-600">Sabit</span>
                          ) : (
                            <span className={`text-sm font-bold ${!isReturn && isSale ? qtyColor : "text-emerald-600"}`}>
                              {qtySign}{Math.abs(m.quantity)} Adet
                            </span>
                          )}
                        </td>
                        <td className="w-[130px] px-6 py-5 align-middle text-right">
                          <span className="text-sm font-medium text-slate-600">
                            {m.unit_price != null
                              ? fmt(convertFull(m.unit_price, product.currency || "TRY", viewCurrency), viewCurrency)
                              : "—"}
                          </span>
                        </td>
                        <td className="w-auto px-6 py-5 align-middle">
                          <span className="text-sm text-slate-500 italic line-clamp-2 break-words" title={m.notes ?? ""}>
                            {m.notes ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-surface-container-low/30 border-t border-indigo-50 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            {allMovements.total === 0
              ? "Kayıt bulunamadı"
              : `${allMovements.data.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE).length} / ${allMovements.total} kayıt gösteriliyor (Sayfa ${currentPage + 1})`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsAnimating(true);
                setCurrentPage(currentPage - 1);
                setTimeout(() => setIsAnimating(false), 300);
              }}
              disabled={currentPage === 0}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-indigo-50 transition-all bg-white flex items-center gap-2 disabled:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 enabled:text-primary enabled:hover:bg-indigo-50"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Önceki
            </button>
            <button
              onClick={() => {
                setIsAnimating(true);
                setCurrentPage(currentPage + 1);
                setTimeout(() => setIsAnimating(false), 300);
              }}
              disabled={(currentPage + 1) * ITEMS_PER_PAGE >= allMovements.total}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-indigo-50 transition-all bg-white flex items-center gap-2 disabled:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 enabled:text-primary enabled:hover:bg-indigo-50"
            >
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
              Sonraki
            </button>
          </div>
        </div>
      </section>

      {/* ── Stok Ayarlama Modalı ── */}
      {product && userId && (
        <StockAdjustmentModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          onSuccess={handleStockUpdateSuccess}
          onTableRefresh={updateProductData}
          productId={product.id}
          productName={product.name}
          currentStock={product.stock_quantity}
          // inventory_logs.unit_price ürünün orijinal currency'sinde tutulur,
          // böylece görüntülerken convertFull(unit_price, product.currency, ...) ile doğru çalışır.
          salePriceAtTime={product.sale_price_in_currency || product.sale_price}
          purchasePriceAtTime={product.purchase_price_in_currency || product.purchase_price}
          userId={userId}
        />
      )}

      {/* ── Toast Notification Container ── */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#363636",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
          },
          success: {
            duration: 3000,
            style: {
              background: "#10b981",
              color: "white",
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "#ef4444",
              color: "white",
            },
          },
        }}
      />
    </div>
  );
}
