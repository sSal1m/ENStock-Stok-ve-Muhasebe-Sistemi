"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Category {
  id: string;
  name: string;
}

interface ProductForm {
  name: string;
  sku: string;
  category_id: string;
  purchase_price: string;
  sale_price: string;
  stock_quantity: string;
  critical_limit: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [form, setForm] = useState<ProductForm>({
    name: "",
    sku: "",
    category_id: "",
    purchase_price: "",
    sale_price: "",
    stock_quantity: "",
    critical_limit: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [updater, setUpdater] = useState<string>("Bilinmeyen Kullanıcı"); // Opsiyonel bilgi

  // Veri yükleme
  useEffect(() => {
    if (!id) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, prodRes] = await Promise.all([
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("products").select("*").eq("id", id).single(),
        ]);

        if (catRes.error) throw catRes.error;
        if (prodRes.error) throw prodRes.error;

        setCategories(catRes.data || []);
        
        const p = prodRes.data;
        setForm({
          name: p.name || "",
          sku: p.sku || "",
          category_id: p.category_id || "",
          purchase_price: p.purchase_price?.toString() || "0",
          sale_price: p.sale_price?.toString() || "0",
          stock_quantity: p.stock_quantity?.toString() || "0",
          critical_limit: p.critical_limit?.toString() || "0",
        });

        const dateRaw = p.updated_at || p.created_at;
        if (dateRaw) {
          const d = new Date(dateRaw);
          setLastUpdate(
            d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) +
            ", " +
            d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
          );
        } else {
          setLastUpdate("Henüz güncellenmedi");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Kaydetme işlemi
  const handleSave = async () => {
    if (!form.name || !form.sku) {
      setError("Ürün adı ve SKU zorunludur.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updates = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category_id: form.category_id || null,
        purchase_price: parseFloat(form.purchase_price) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        stock_quantity: parseInt(form.stock_quantity, 10) || 0,
        critical_limit: parseInt(form.critical_limit, 10) || 0,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
      
      // Başarılı olursa detaya dön
      router.push(`/inventory/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
      setSaving(false);
    }
  };

  // Anlık kâr hesaplamaları
  const buyPriceNum = parseFloat(form.purchase_price) || 0;
  const sellPriceNum = parseFloat(form.sale_price) || 0;
  const profitAmt = sellPriceNum - buyPriceNum;
  const profitMargin = buyPriceNum > 0 ? (profitAmt / buyPriceNum) * 100 : 0;
  
  // Progress bar genişliği kısıtlaması (0 - 100 arası)
  const progressWidth = Math.min(Math.max(profitMargin, 0), 100);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 animate-pulse space-y-8">
        <div className="h-8 bg-surface-container w-64 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="h-64 bg-surface-container-low rounded-xl"></div>
            <div className="h-64 bg-surface-container-low rounded-xl"></div>
          </div>
          <div className="lg:col-span-4 space-y-8">
            <div className="h-64 bg-surface-container-lowest rounded-xl"></div>
            <div className="h-32 bg-primary/20 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* ── Üst Menü / Navigasyon ── */}
      <nav className="mb-2">
        <ol className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-on-surface-variant/70">
          <li className="cursor-pointer hover:text-primary transition-colors" onClick={() => router.push("/inventory")}>Stok Yönetimi</li>
          <li><span className="material-symbols-outlined text-[14px]">chevron_right</span></li>
          <li className="cursor-pointer hover:text-primary transition-colors" onClick={() => router.push(`/inventory/${id}`)}>Ürün Detay</li>
          <li><span className="material-symbols-outlined text-[14px]">chevron_right</span></li>
          <li className="text-primary font-bold">Düzenle</li>
        </ol>
      </nav>
      
      <div className="flex items-center justify-between mb-10">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Ürünü Düzenle</h2>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 font-semibold text-sm">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Form Alanı (Bento Style Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sol Sütun: Form Girdi Alanları */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* 1. Temel Bilgiler */}
          <section className="bg-surface-container-low rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h3 className="font-headline text-lg font-bold">Temel Bilgiler</h3>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Ürün Adı */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Ürün Adı <span className="text-error">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface font-semibold transition-all outline-none"
                    placeholder="Örn: Premium Akıllı Saat"
                  />
                </div>
                
                {/* SKU */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Barkod / SKU <span className="text-error">*</span></label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface-variant font-mono text-sm transition-all outline-none"
                    placeholder="Örn: WATCH-P-102"
                  />
                </div>
              </div>

              {/* Kategori Seçimi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Kategori</label>
                <div className="relative">
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface font-medium transition-all outline-none appearance-none"
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Finansal ve Stok Durumu */}
          <section className="bg-surface-container-low rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h3 className="font-headline text-lg font-bold">Finansal ve Stok Durumu</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              {/* Alış Fiyatı */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline" htmlFor="buy-price">Alış Fiyatı</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">payments</span>
                  <input
                    id="buy-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.purchase_price}
                    onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                    className="w-full pl-12 pr-10 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface font-medium transition-all outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">TL</span>
                </div>
              </div>
              
              {/* Satış Fiyatı */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline" htmlFor="sell-price">Satış Fiyatı</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">sell</span>
                  <input
                    id="sell-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className="w-full pl-12 pr-10 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface font-medium transition-all outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">TL</span>
                </div>
              </div>

              {/* Güncel Stok */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline" htmlFor="stock-qty">Güncel Stok Miktarı</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">inventory</span>
                  <input
                    id="stock-qty"
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface font-medium transition-all outline-none"
                  />
                </div>
              </div>

              {/* Kritik Stok */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline" htmlFor="critical-stock">Kritik Stok Uyarısı</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-error">warning</span>
                  <input
                    id="critical-stock"
                    type="number"
                    min="0"
                    value={form.critical_limit}
                    onChange={(e) => setForm({ ...form, critical_limit: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-error/20 rounded-lg text-on-surface font-medium transition-all outline-none"
                  />
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* Sağ Sütun: Görseller, Kâr Analizi ve Meta Bilgileri */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Ürün Görseli (Gelecekte eklenecek, şimdilik statik UI) */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm ring-1 ring-outline-variant/10">
            <label className="text-[11px] font-bold uppercase tracking-wider text-outline mb-4 block">Ürün Görseli</label>
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-surface-container shadow-inner mb-4 relative group flex items-center justify-center">
              <span className="text-indigo-200 font-black text-9xl select-none">
                {form.name ? form.name.charAt(0).toUpperCase() : "?"}
              </span>
              <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-white text-3xl">add_a_photo</span>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed italic text-center">
              Görseli değiştirmek için üzerine tıklayın. Önerilen boyut: 800x800px.
            </p>
          </div>

          {/* Tahmini Kâr Kartı (Dinamik) */}
          <div className={`p-6 rounded-xl text-white shadow-xl transition-colors duration-300 ${profitAmt >= 0 ? "bg-primary shadow-primary/20" : "bg-error shadow-error/20"}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">Tahmini Kâr</h4>
                <p className="font-headline text-2xl font-extrabold">{profitAmt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</p>
              </div>
              <span className="material-symbols-outlined opacity-50 text-3xl">
                {profitAmt >= 0 ? "trending_up" : "trending_down"}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Kâr Marjı</span>
                <span className="font-bold">%{profitMargin.toFixed(2)}</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white transition-all duration-500 ease-out`} 
                  style={{ width: `${progressWidth}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Meta Bilgileri */}
          <div className="bg-surface-container-low p-6 rounded-xl space-y-4 shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">history</span>
              <div className="text-[11px]">
                <p className="text-outline uppercase font-bold tracking-tight">Son Güncelleme</p>
                <p className="text-on-surface font-medium">{lastUpdate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">person</span>
              <div className="text-[11px]">
                <p className="text-outline uppercase font-bold tracking-tight">Düzenleyen</p>
                <p className="text-on-surface font-medium">{updater}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alt Aksiyon Butonları ── */}
      <div className="mt-12 pt-8 border-t border-outline-variant/15 flex flex-col md:flex-row items-center justify-end gap-6">
        <button 
          onClick={() => router.push(`/inventory/${id}`)}
          className="text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors order-2 md:order-1"
        >
          Vazgeç
        </button>
        <button 
          disabled={saving}
          onClick={handleSave}
          className="bg-gradient-to-br from-primary to-primary-container text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 md:order-2 disabled:opacity-70 flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              Kaydediliyor...
            </>
          ) : (
            <>
              Değişiklikleri Kaydet
            </>
          )}
        </button>
      </div>
    </div>
  );
}
