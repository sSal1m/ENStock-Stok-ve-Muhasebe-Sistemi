"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ─── Tipler ────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
}

interface FormState {
  name: string;
  sku: string;
  category_id: string;
  description: string;
  purchase_price: string;
  sale_price: string;
  stock_quantity: string;
  critical_limit: string;
  tax_rate: number; // 1 | 10 | 20
}

const INITIAL_FORM: FormState = {
  name: "",
  sku: "",
  category_id: "",
  description: "",
  purchase_price: "",
  sale_price: "",
  stock_quantity: "",
  critical_limit: "",
  tax_rate: 20,
};

// ─── Yardımcılar ────────────────────────────────────────────────────────────

function toNum(val: string): number {
  const n = parseFloat(val.replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function fmtTRY(val: number): string {
  return val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TRY";
}

// ─── Bileşen ────────────────────────────────────────────────────────────────

export default function NewInventoryPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catLoading, setCatLoading] = useState(true);

  // ── Kategorileri Çek ────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (!error && data) setCategories(data as Category[]);
      setCatLoading(false);
    }
    fetchCategories();
  }, []);

  // ── Form Değişiklik Handler ─────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  // ── Hesaplamalar (Hızlı Özet) ───────────────────────────────────────────
  const salePrice = toNum(form.sale_price);
  const purchasePrice = toNum(form.purchase_price);
  const vatAmount = salePrice * (form.tax_rate / 100);
  const priceWithVat = salePrice + vatAmount;
  const margin = purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice) * 100 : 0;

  // ── Kaydet ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError("Ürün adı zorunludur."); return; }
    if (!form.sku.trim()) { setError("Barkod / SKU zorunludur."); return; }
    if (!form.category_id) { setError("Lütfen bir kategori seçin."); return; }

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from("products").insert({
        name: form.name.trim(),
        sku: form.sku.trim(),
        category_id: form.category_id,
        description: form.description.trim() || null,
        purchase_price: toNum(form.purchase_price),
        sale_price: toNum(form.sale_price),
        stock_quantity: Math.round(toNum(form.stock_quantity)),
        critical_limit: Math.round(toNum(form.critical_limit)),
        tax_rate: form.tax_rate,
      });

      if (insertError) throw insertError;
      router.push("/inventory");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.");
      setSaving(false);
    }
  }

  // ─── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">

        {/* ── Sayfa Başlığı ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
              <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => router.push("/inventory")}>Stok Yönetimi</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary font-medium">Yeni Ürün Kaydı</span>
            </nav>
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
              Yeni Ürün Kaydı
            </h2>
          </div>
        </div>

        {/* ── Hata Mesajı ── */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-error-container/20 border border-error-container rounded-xl text-sm font-semibold text-error">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-error/60 hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* ── İçerik Grid ── */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ── Sol Sütun: Form ── */}
            <div className="lg:col-span-8 space-y-6">

              {/* Temel Bilgiler */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/5 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h3 className="text-lg font-bold text-on-surface">Ürün Temel Bilgileri</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Ürün Adı */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Ürün Adı <span className="text-error">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm placeholder:text-on-surface-variant/40 outline-none"
                      placeholder="Örn: Logitech MX Master 3S"
                      type="text"
                      required
                    />
                  </div>

                  {/* Barkod / SKU */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Barkod / SKU <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="sku"
                        value={form.sku}
                        onChange={handleChange}
                        className="w-full bg-surface-container-low border-none rounded-lg pl-4 pr-10 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm outline-none"
                        placeholder="SKU-00123"
                        type="text"
                        required
                      />
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant/50">
                        barcode_scanner
                      </span>
                    </div>
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Kategori <span className="text-error">*</span>
                    </label>
                    <select
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm text-on-surface-variant outline-none"
                      required
                    >
                      <option value="">{catLoading ? "Yükleniyor..." : "Kategori Seçiniz"}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Açıklama */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Açıklama (Opsiyonel)
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm placeholder:text-on-surface-variant/40 outline-none resize-none"
                      placeholder="Ürün açıklaması..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Stok ve Birim */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/5 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h3 className="text-lg font-bold text-on-surface">Stok ve Birim</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Mevcut Stok */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Başlangıç Stok Adedi
                    </label>
                    <input
                      name="stock_quantity"
                      value={form.stock_quantity}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm outline-none"
                      placeholder="0"
                      type="number"
                      min="0"
                      step="1"
                    />
                  </div>

                  {/* Kritik Stok Seviyesi */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Kritik Stok Seviyesi
                    </label>
                    <input
                      name="critical_limit"
                      value={form.critical_limit}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm outline-none"
                      placeholder="10"
                      type="number"
                      min="0"
                      step="1"
                    />
                    <p className="mt-2 text-[10px] text-on-surface-variant/60">
                      Stok bu değerin altına düştüğünde uyarı alırsınız.
                    </p>
                  </div>
                </div>
              </div>

              {/* Finansal Bilgiler */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/5 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h3 className="text-lg font-bold text-on-surface">Finansal Bilgiler</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Alış Fiyatı */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Alış Fiyatı
                    </label>
                    <div className="relative">
                      <input
                        name="purchase_price"
                        value={form.purchase_price}
                        onChange={handleChange}
                        className="w-full bg-surface-container-low border-none rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium outline-none"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-3 text-on-surface-variant/50 text-xs font-bold">
                        TRY
                      </span>
                    </div>
                  </div>

                  {/* Satış Fiyatı */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Satış Fiyatı
                    </label>
                    <div className="relative">
                      <input
                        name="sale_price"
                        value={form.sale_price}
                        onChange={handleChange}
                        className="w-full bg-surface-container-low border-none rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium outline-none"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-3 text-on-surface-variant/50 text-xs font-bold">
                        TRY
                      </span>
                    </div>
                  </div>

                  {/* KDV Oranı */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      KDV Oranı
                    </label>
                    <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-lg h-[44px]">
                      {[1, 10, 20].map((rate) => (
                        <label key={rate} className="flex-1 flex items-center justify-center cursor-pointer">
                          <input
                            type="radio"
                            name="tax_rate"
                            value={rate}
                            checked={form.tax_rate === rate}
                            onChange={() => setForm((prev) => ({ ...prev, tax_rate: rate }))}
                            className="hidden"
                          />
                          <div
                            className={`w-full py-1 text-center text-xs font-bold rounded-md transition-all ${
                              form.tax_rate === rate
                                ? "bg-white text-primary shadow-sm"
                                : "text-on-surface-variant hover:text-on-surface"
                            }`}
                          >
                            %{rate}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sağ Sütun ── */}
            <div className="lg:col-span-4 space-y-6">

              {/* Görsel Yükleme */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5 shadow-sm">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">
                  Ürün Görseli
                </label>
                <div className="relative group cursor-pointer border-2 border-dashed border-outline-variant/30 rounded-xl bg-surface-container-low hover:bg-white hover:border-primary/40 transition-all p-8 text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      add_photo_alternate
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface mb-1">Görsel Yükle</p>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    Sürükle bırak veya seçmek için tıklayın.
                    <br />
                    (PNG, JPG - Maks 5MB)
                  </p>
                  <input className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" type="file" accept="image/*" />
                </div>
              </div>

              {/* Hızlı Özet & Aksiyonlar */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5 shadow-sm flex flex-col gap-4">
                {/* Hesaplama Özeti */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-sm">info</span>
                    <span className="text-xs font-bold text-primary uppercase tracking-tighter">
                      Hızlı Özet
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">KDV Dahil Satış:</span>
                      <span className="font-bold text-on-surface">{fmtTRY(priceWithVat)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Kâr Marjı:</span>
                      <span
                        className={`font-bold ${
                          margin > 0 ? "text-emerald-600" : margin < 0 ? "text-error" : "text-on-surface"
                        }`}
                      >
                        {margin > 0 ? "+" : ""}
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">KDV Tutarı:</span>
                      <span className="font-bold text-on-surface">{fmtTRY(vatAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Butonlar */}
                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gradient-to-br from-primary to-primary-container text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-base">
                          progress_activity
                        </span>
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          save
                        </span>
                        <span>Kaydı Tamamla</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/inventory")}
                    disabled={saving}
                    className="w-full bg-surface-container-low text-on-surface font-semibold py-4 rounded-xl hover:bg-surface-container-high transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    İptal Et
                  </button>
                </div>

                <p className="text-[10px] text-center text-on-surface-variant/50 italic">
                  * ile işaretli alanlar zorunludur
                </p>
              </div>

              {/* Dekoratif Görsel */}
              <div className="rounded-xl overflow-hidden relative aspect-video shadow-lg group">
                <img
                  alt="Envanter görseli"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnSDSJfSksBOCB0iY82seQz92XZgMs_shVRTu1UBJ2eiqeqZkNtTn6d8xB1-w3rybHUCKkuGQRRLVWjui_9aHz7wW6E0QpKxR7TYv8-qyckxJfehT2NY_lgZjyHI5TPz-OEvafijJKbUhgghh6sjl4cCEO4YRBEU2JbLTRqEJdwoQyqtDwbwAyn7e5gqmy6yWl6T4OvDMBGbqFuQ1TX9cFGz7fAW_v1bLcvuvM3-2PKoDrFF1cnYQoKoyrHAyIGX5u0Y9F3YGCe6M"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent flex items-end p-4">
                  <div>
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest opacity-80">
                      İpucu
                    </p>
                    <p className="text-white text-xs font-medium">
                      Doğru barkod girişi stok sayım hızınızı %40 artırır.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
