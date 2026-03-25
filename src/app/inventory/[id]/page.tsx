"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ─── Tipler ────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  sku: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  critical_limit: number;
  tax_rate: number;
  categories: { name: string }[] | null;
}

interface StockMovement {
  id: string;
  date: string;       // ISO string
  type: string;       // 'sale' | 'purchase' | 'return' | 'adjustment' etc.
  quantity: number;
  unit_price: number | null;
  notes: string | null;
}

// ─── Yardımcılar ────────────────────────────────────────────────────────────

function fmt(val: number): string {
  return (
    val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺"
  );
}

function fmtDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function MovementBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; icon: string; cls: string }> = {
    sale:       { label: "Satış",       icon: "trending_down",          cls: "bg-emerald-50 text-emerald-700" },
    purchase:   { label: "Alış",        icon: "add_shopping_cart",      cls: "bg-indigo-50 text-indigo-700" },
    return:     { label: "İade",        icon: "settings_backup_restore", cls: "bg-red-50 text-red-700" },
    adjustment: { label: "Stok Sayımı", icon: "inventory",              cls: "bg-amber-50 text-amber-700" },
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

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Ürün + kategori
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("id, sku, name, purchase_price, sale_price, stock_quantity, critical_limit, tax_rate, categories(name)")
          .eq("id", id)
          .single();

        if (prodErr) throw prodErr;
        setProduct(prod as Product);

        // 2. Stok hareket geçmişi — invoice_items JOIN invoices
        const { data: items } = await supabase
          .from("invoice_items")
          .select("id, quantity, unit_price, invoices(id, invoice_date, type, notes)")
          .eq("product_id", id)
          .order("id", { ascending: false })
          .limit(20);

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
          setMovements(mapped);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ürün yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  // ── Hesaplamalar ──────────────────────────────────────────────────────────
  const margin =
    product && product.purchase_price > 0
      ? ((product.sale_price - product.purchase_price) / product.purchase_price) * 100
      : 0;

  const totalStockValue = product
    ? product.stock_quantity * product.purchase_price
    : 0;

  const categoryName = product?.categories?.[0]?.name ?? "Kategori Yok";

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

  // ── Ana İçerik ────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Ekmek Kırıntısı (Breadcrumb) ── */}
      <nav className="flex items-center gap-2 text-sm font-medium text-slate-400">
        <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => router.push("/inventory")}>Envanter</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-on-surface font-semibold">Ürün Detayı</span>
      </nav>

      {/* ── Bölüm 1: Ürün Özeti ── */}
      <section className="bg-surface-container-low rounded-3xl p-8 relative overflow-hidden">
        {/* Arka plan dekor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center relative z-10">

          {/* Ürün Avatarı */}
          <div className="w-full lg:w-48 h-48 bg-white rounded-2xl shadow-sm flex-shrink-0 flex items-center justify-center border border-indigo-50/50">
            <span className="text-indigo-300 font-black text-7xl select-none">
              {product.name.charAt(0).toUpperCase()}
            </span>
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
            <button
              onClick={() => router.push(`/inventory/${id}/edit`)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-on-surface font-bold rounded-xl shadow-sm border border-indigo-50 hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              <span>Ürünü Düzenle</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:opacity-90 transition-all">
              <span className="material-symbols-outlined text-lg">swap_vert</span>
              <span>Stok Ekle/Çıkar</span>
            </button>
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
            {fmt(product.purchase_price)}
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
            {fmt(product.sale_price)}
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
              {margin >= 0 ? "+" : ""}{(product.sale_price - product.purchase_price).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
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
            {fmt(totalStockValue)}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                {["Tarih", "İşlem Türü", "Miktar", "Birim Fiyat", "Açıklama"].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-slate-200 text-5xl block mb-3">
                      history
                    </span>
                    <p className="text-slate-400 font-semibold">Henüz hareket kaydı yok</p>
                    <p className="text-slate-300 text-sm mt-1">
                      Bu ürüne ait fatura hareketi oluştuğunda burada görünecek
                    </p>
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const { date, time } = fmtDate(m.date);
                  const isSale = m.type === "sale";
                  const isReturn = m.type === "return";
                  const qtySign = isSale ? "-" : "+";
                  const qtyColor = isSale ? "text-error" : "text-emerald-600";

                  return (
                    <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">{date}</span>
                          <span className="text-[10px] text-slate-400">{time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <MovementBadge type={m.type} />
                      </td>
                      <td className="px-6 py-5">
                        {m.type === "adjustment" ? (
                          <span className="text-sm font-bold text-slate-600">Sabit</span>
                        ) : (
                          <span className={`text-sm font-bold ${!isReturn && isSale ? qtyColor : "text-emerald-600"}`}>
                            {qtySign}{Math.abs(m.quantity)} Adet
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-600">
                        {m.unit_price != null ? fmt(m.unit_price) : "—"}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500 italic">
                        {m.notes ?? "—"}
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
            {movements.length === 0
              ? "Kayıt bulunamadı"
              : `Toplam ${movements.length} kayıt gösteriliyor`}
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-xs font-bold text-slate-300 bg-white rounded-lg border border-indigo-50 cursor-not-allowed">
              Önceki
            </button>
            <button className="px-4 py-2 text-xs font-bold text-primary bg-white rounded-lg border border-indigo-50 hover:bg-indigo-50 transition-all">
              Sonraki
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
