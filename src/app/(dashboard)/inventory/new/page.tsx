"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { fetchDefaultCurrency } from "@/lib/defaultCurrency";
import { logActivityAction } from "@/app/(dashboard)/activity-log/actions";
import { uploadProductImageAction } from "@/app/(dashboard)/settings/profile/actions";
import { formatDescription } from "@/lib/productImageHelper";
import { usePermissions } from "@/hooks/usePermissions";

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
  currency: string;
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
  currency: "TRY",
};

// ─── Yardımcılar ────────────────────────────────────────────────────────────

function toNum(val: string): number {
  const n = parseFloat(val.replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function fmtCurr(val: number, currency: string): string {
  return val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency;
}

// ─── Bileşen ────────────────────────────────────────────────────────────────

export default function NewInventoryPage() {
  const router = useRouter();
  const { hasPermission, isLoading: permsLoading } = usePermissions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catLoading, setCatLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const { rates, convertFull } = useCurrencyConverter();

  const [imageUrl, setImageUrl] = useState<string>("");
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);

  useEffect(() => {
    if (!permsLoading && !hasPermission("stock", "create")) {
      toast.error("Bu işlem için yetkiniz bulunmamaktadır.");
      router.replace("/inventory");
    }
  }, [permsLoading, hasPermission, router]);

  if (permsLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-slate-600">Yetkiler kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'den büyük olamaz.");
      return;
    }

    setIsImageUploading(true);
    const toastId = toast.loading("Görsel yükleniyor...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const result = await uploadProductImageAction(base64Data, file.name, file.type, userId);

          if (!result.success || !result.publicUrl) {
            throw new Error(result.error || "Görsel yükleme başarısız.");
          }

          setImageUrl(result.publicUrl);
          toast.success("Ürün görseli başarıyla yüklendi.", { id: toastId });
        } catch (innerErr: any) {
          toast.error(`Yükleme hatası: ${innerErr.message}`, { id: toastId });
        } finally {
          setIsImageUploading(false);
        }
      };

      reader.onerror = () => {
        throw new Error("Dosya okunamadı.");
      };
    } catch (err: any) {
      toast.error(`Yükleme hatası: ${err.message}`, { id: toastId });
      setIsImageUploading(false);
    }
  };

  // ── Kullanıcı ID'sini Al ve işletme default currency'sini forma uygula ─
  useEffect(() => {
    async function getUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setError("Kullanıcı oturum açmamış.");
        return;
      }
      setUserId(user.id);

      const businessCurrency = await fetchDefaultCurrency(user.id);
      setForm((prev) => ({ ...prev, currency: businessCurrency }));
    }
    getUser();
  }, []);

  // ── Kategorileri Çek (sadece bu şirketin) ────────────────────────────
  useEffect(() => {
    async function fetchCategories() {
      if (!userId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userId)
        .single();
      const business_id = profile?.business_id;

      if (!business_id) {
        setCategories([]);
        setCatLoading(false);
        return;
      }
      
      console.log("📦 Kategoriler çekiliyor - Business ID:", business_id);
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("business_id", business_id)
        .order("name");
      
      if (error) {
        console.error("❌ Kategorileri çekme hatası:", error);
        console.error("Hata detayları:", {
          message: error.message,
          code: error.code,
          hint: error.hint,
        });
      } else {
        console.log("✅ Kategoriler başarıyla çekildi:", data);
        if (data) setCategories(data as Category[]);
      }
      setCatLoading(false);
    }
    fetchCategories();
  }, [userId]);

  // ── Form Değişiklik Handler ─────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  // ── Yeni Kategori Ekle ──────────────────────────────────────────────────
  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      toast.error("Kategori adı boş olamaz.");
      return;
    }

    setSavingCategory(true);
    try {
      // ✅ User Session Check: Mevcut kullanıcıyı auth'dan al
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        const errorMsg = "Kullanıcı oturum açmamış.";
        toast.error(errorMsg);
        setSavingCategory(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", authData.user.id)
        .single();
      const business_id = profile?.business_id;

      if (!business_id) {
        const errorMsg = "Yetkisiz işlem";
        toast.error(errorMsg);
        setSavingCategory(false);
        return;
      }

      const currentUserId = authData.user.id;
      console.log("🔐 Mevcut User ID:", currentUserId, "Business ID:", business_id);

      // ✅ Debug: Insert işleminde gönderilecek veriyi göster
      const insertPayload = {
        user_id: currentUserId,
        business_id: business_id,
        name: newCategoryName.trim(),
        created_at: new Date().toISOString(),
      };
      console.log("📤 Kategoriye gönderilecek veri:", insertPayload);

      // ✅ Explicit ID: user_id ve business_id mutlaka eklenmiş durumda
      const { data: insertedCategory, error: insertError } = await supabase
        .from("categories")
        .insert(insertPayload)
        .select();

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error("Bu isimde bir kategori şirketinizde zaten mevcut");
          return;
        }
        console.error("❌ Kategori ekleme hatası:", insertError);
        console.error("Hata detayları:", {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        });
        throw insertError;
      }

      console.log("✅ Kategori başarıyla eklendi:", insertedCategory);

      // Yeni kategoriyi form state'ine ekle
      if (insertedCategory && insertedCategory.length > 0) {
        const newCategory = insertedCategory[0];
        setCategories((prev) => [...prev, newCategory]);
        setForm((prev) => ({ ...prev, category_id: newCategory.id }));
        
        // Toast'ta doğru kategori adını göster
        const categoryNameForToast = newCategoryName;
        setNewCategoryName("");
        setShowNewCategoryForm(false);
        toast.success(`"${categoryNameForToast}" kategorisi başarıyla eklendi!`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Kategori eklenirken bir hata oluştu.";
      console.error("🔥 Kategori ekleme detaylı hatası:", err);
      toast.error(errorMsg);
    } finally {
      setSavingCategory(false);
    }
  }

  // ── Hesaplamalar (Hızlı Özet) ───────────────────────────────────────────
  const salePrice = toNum(form.sale_price);
  const purchasePrice = toNum(form.purchase_price);
  
  // Döviz Çevrimi (Görsel Yardım için - Hook üzerinden)
  const purchasePriceTRY = convertFull(purchasePrice, form.currency, "TRY");
  const salePriceTRY = convertFull(salePrice, form.currency, "TRY");

  const vatAmount = salePrice * (form.tax_rate / 100);
  const priceWithVat = salePrice + vatAmount;
  const margin = purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice) * 100 : 0;

  // ── Kaydet ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!userId) {
      const msg = "Kullanıcı oturum açmamış.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!form.name.trim()) { 
      const msg = "Ürün adı zorunludur.";
      setError(msg);
      toast.error(msg);
      return; 
    }
    if (!form.sku.trim()) { 
      const msg = "Barkod / SKU zorunludur.";
      setError(msg);
      toast.error(msg);
      return; 
    }
    if (!form.category_id) { 
      const msg = "Lütfen bir kategori seçin.";
      setError(msg);
      toast.error(msg);
      return; 
    }

    setSaving(true);
    try {
      console.log("📝 Ürün kaydı başlatılıyor - User ID:", userId);

      // formatDescription'ı kullanarak açıklama alanına görseli ekliyoruz
      const finalDescription = formatDescription(form.description.trim(), imageUrl);

      // `.select()` ile yeni ürünün id'sini de al
      const productPayload = {
        user_id: userId,
        name: form.name.trim(),
        sku: form.sku.trim(),
        category_id: form.category_id,
        description: finalDescription || null,
        currency: form.currency,
        purchase_price_in_currency: toNum(form.purchase_price),
        sale_price_in_currency: toNum(form.sale_price),
        purchase_price: purchasePriceTRY, // TRY karşılığı (Hızlı raporlama için)
        sale_price: salePriceTRY,         // TRY karşılığı
        stock_quantity: Math.round(toNum(form.stock_quantity)),
        critical_limit: Math.round(toNum(form.critical_limit)),
        tax_rate: form.tax_rate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log("📤 Products'a gönderilecek veri:", productPayload);

      const { data: insertedData, error: insertError } = await supabase
        .from("products")
        .insert(productPayload)
        .select();

      if (insertError) {
        console.error("❌ Ürün ekleme hatası:", insertError);
        console.error("Hata detayları:", {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        });
        throw insertError;
      }

      console.log("✅ Ürün başarıyla eklendi:", insertedData);

      // ✅ Yeni ürün kaydının id'sini al ve inventory_logs'a kaydet (unit_price ile)
      const newProduct = insertedData?.[0];
      if (newProduct) {
        const purchasePrice = Number(form.purchase_price) || 0;
        
        const logPayload = {
          user_id: userId,
          product_id: newProduct.id,
          action_type: "Ürün Oluşturma",
          quantity_change: newProduct.stock_quantity,
          previous_stock: 0,
          new_stock: newProduct.stock_quantity,
          unit_price: purchasePrice || null,
          note: "Yeni ürün oluşturuldu",
          created_at: new Date().toISOString(),
        };
        console.log("📤 Inventory_logs'a gönderilecek veri:", logPayload);

        const { error: logError } = await supabase
          .from("inventory_logs")
          .insert(logPayload);

        if (logError) {
          console.error("❌ inventory_logs kaydında hata:", logError);
          console.error("Log hata detayları:", {
            message: logError.message,
            code: logError.code,
            hint: logError.hint,
          });
          // Log hatası kritik değil, devam et
        } else {
          console.log("✅ Inventory_logs başarıyla eklendi");
        }

        // Audit trail (activity_logs)
        await logActivityAction({
          userId,
          module: "product",
          action: "create",
          entityId: newProduct.id,
          entityName: newProduct.name,
          description: `"${newProduct.name}" ürünü oluşturuldu (Başlangıç stok: ${newProduct.stock_quantity})`,
          metadata: {
            sku: newProduct.sku,
            stock_quantity: newProduct.stock_quantity,
            purchase_price: newProduct.purchase_price,
            sale_price: newProduct.sale_price,
            currency: newProduct.currency,
          },
        });
      }

      toast.success(`"${form.name}" başarıyla eklendi!`, {
        duration: 3000,
        icon: "✅",
      });

      setTimeout(() => {
        router.push("/inventory");
      }, 1500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.";
      console.error("🔥 Ürün kaydetme detaylı hatası:", err);
      
      // RLS veya auth hataları için ekstra debug
      if (err && typeof err === "object" && "code" in err) {
        console.error("Supabase Hata Kodu:", (err as any).code);
        console.error("Supabase Hata Hint:", (err as any).hint);
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
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
                    {!showNewCategoryForm ? (
                      <>
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
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryForm(true)}
                          className="mt-2 text-xs font-semibold text-primary hover:text-primary-container transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Yeni Kategori Ekle
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Kategori adı..."
                            className="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddCategory}
                            disabled={savingCategory}
                            className="px-4 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-container transition-all disabled:opacity-60"
                          >
                            {savingCategory ? "..." : "Ekle"}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryForm(false);
                            setNewCategoryName("");
                          }}
                          className="text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    )}
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
                  <div className="md:col-span-1">
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
                        {form.currency}
                      </span>
                    </div>
                    {form.currency !== "TRY" && rates && (
                      <p className="mt-1 text-[10px] text-emerald-600 font-bold">
                        ≈ {fmtCurr(purchasePriceTRY, "TRY")}
                      </p>
                    )}
                  </div>

                  {/* Satış Fiyatı */}
                  <div className="md:col-span-1">
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
                        {form.currency}
                      </span>
                    </div>
                    {form.currency !== "TRY" && rates && (
                      <p className="mt-1 text-[10px] text-emerald-600 font-bold">
                        ≈ {fmtCurr(salePriceTRY, "TRY")}
                      </p>
                    )}
                  </div>

                  {/* Döviz Seçimi */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Döviz Birimi
                    </label>
                    <select
                      name="currency"
                      value={form.currency}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-bold text-primary outline-none h-[44px]"
                    >
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  {/* KDV Oranı */}
                  <div className="md:col-span-3">
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
                <div className="relative group cursor-pointer border-2 border-dashed border-outline-variant/30 rounded-xl bg-surface-container-low hover:bg-white hover:border-primary/40 transition-all p-8 text-center min-h-[200px] flex flex-col justify-center items-center overflow-hidden">
                  {imageUrl ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden group">
                      <img
                        src={imageUrl}
                        alt="Ürün Görseli Önizleme"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="material-symbols-outlined text-white text-2xl">edit</span>
                        <span className="text-white text-xs font-bold uppercase tracking-wider">Değiştir</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        {isImageUploading ? (
                          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-primary text-3xl">
                            add_photo_alternate
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-on-surface mb-1">
                        {isImageUploading ? "Yükleniyor..." : "Görsel Yükle"}
                      </p>
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        Sürükle bırak veya seçmek için tıklayın.
                        <br />
                        (PNG, JPG - Maks 5MB)
                      </p>
                    </>
                  )}
                  <input
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isImageUploading}
                  />
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
                      <span className="font-bold text-on-surface">{fmtCurr(priceWithVat, form.currency)}</span>
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
                      <span className="font-bold text-on-surface">{fmtCurr(vatAmount, form.currency)}</span>
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
