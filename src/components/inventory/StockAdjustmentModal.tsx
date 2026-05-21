"use client";

import { useRef, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { logActivityAction } from "@/app/(dashboard)/activity-log/actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>; // ✅ async function
  productId: string;
  productName: string;
  currentStock: number;
  salePriceAtTime?: number;
  purchasePriceAtTime?: number;
  onTableRefresh?: () => Promise<void>;
  userId?: string;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  productId,
  productName,
  currentStock,
  salePriceAtTime = 0,
  purchasePriceAtTime = 0,
  onTableRefresh,
  userId,
}: Props) {
  const [operationType, setOperationType] = useState<"add" | "subtract">("add");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Modal açıldığında formu sıfırla ve odakla
  useEffect(() => {
    if (isOpen) {
      setQuantity("");
      setNotes("");
      setOperationType("add");
      setError(null);
      setSaving(false);
      setTimeout(() => quantityInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ESC tuşu ile kapat
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validasyon
    const qty = Number(quantity); // ✅ Number() ile dönüştür
    if (isNaN(qty) || qty <= 0) {
      const msg = "Geçerli bir miktar girin (0'dan büyük).";
      setError(msg);
      toast.error(msg);
      return;
    }

    // ✅ GÖREV 1: Negatif Stok Koruması
    if (operationType === "subtract" && qty > currentStock) {
      const msg = "Yetersiz stok! Mevcut stoktan daha fazla azaltma yapamazsınız.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);

    try {
      // Yeni stok miktarını hesapla
      const newStockQuantity =
        operationType === "add"
          ? currentStock + qty
          : currentStock - qty;

      console.log("📝 Stok güncelleme işlemi başlatılıyor");
      console.log("📊 Mevcut stok:", currentStock, "→ Yeni stok:", newStockQuantity);
      console.log("🔐 User ID:", userId, "Product ID:", productId);

      // ✅ Supabase'de ürünü güncelle - güncellemenin başarılı olduğunu kontrol et
      const { data: updateData, error: updateError } = await supabase
        .from("products")
        .update({
          stock_quantity: newStockQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .eq("user_id", userId || "")
        .select();

      if (updateError) {
        console.error("❌ Ürün güncelleme hatası:", updateError);
        console.error("Hata detayları:", {
          message: updateError.message,
          code: updateError.code,
          hint: updateError.hint,
        });
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        const msg = "Stok güncellenemedi. Erişim izinlerinizi kontrol edin.";
        console.error("❌ " + msg);
        setError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }

      console.log("✅ Ürün güncellemesi başarılı:", updateData);

      // ✅ GÖREV 2: Stok Hareketini Kaydet (unit_price ile)
      const previousStock = currentStock;
      const quantityChange = operationType === "add" ? qty : -qty;
      const actionType = operationType === "add" ? "Artır" : "Azalt";
      
      // İşlem anındaki birim fiyat (satış veya alış fiyatı)
      const unitPrice = operationType === "add" ? purchasePriceAtTime : salePriceAtTime;

      const logPayload = {
        user_id: userId,
        product_id: productId,
        action_type: actionType,
        quantity_change: quantityChange,
        previous_stock: previousStock,
        new_stock: newStockQuantity,
        unit_price: unitPrice || null,
        note: notes || null,
        created_at: new Date().toISOString(),
      };
      console.log("📤 Inventory_logs'a gönderilecek veri:", logPayload);

      const { error: logError } = await supabase
        .from("inventory_logs")
        .insert(logPayload);

      if (logError) {
        console.error("⚠️ inventory_logs kaydında hata:", logError);
        console.error("Log hata detayları:", {
          message: logError.message,
          code: logError.code,
          hint: logError.hint,
        });
        // Ürün zaten güncellendiği için, log hatası kritik değil ama konsola yaz
      } else {
        console.log("✅ Inventory_logs başarıyla kaydedildi");
      }

      // Audit trail (activity_logs)
      if (userId) {
        await logActivityAction({
          userId,
          module: "product",
          action: "stock_adjust",
          entityId: productId,
          entityName: productName,
          description: `"${productName}" stoğu ${operationType === "add" ? "artırıldı" : "azaltıldı"} (${quantityChange > 0 ? "+" : ""}${quantityChange}) — ${previousStock} → ${newStockQuantity}`,
          metadata: {
            operation: operationType,
            quantity_change: quantityChange,
            previous_stock: previousStock,
            new_stock: newStockQuantity,
            note: notes || null,
          },
        });
      }

      const action =
        operationType === "add"
          ? `${qty} Adet Eklendi`
          : `${qty} Adet Çıkarıldı`;

      toast.success(
        `${action} (Yeni Stok: ${newStockQuantity} Adet)`,
        {
          duration: 3000,
          icon: "📦",
        }
      );

      // ✅ GÖREV 3: Tablo verilerini anında güncelle ve sayfayı yenile
      if (onTableRefresh) {
        console.log("🔄 Hareket tablosu yenileniyor...");
        try {
          await onTableRefresh();
          console.log("✅ Hareket tablosu başarıyla yenilendi");
        } catch (refreshErr) {
          console.error("⚠️ Tablo yenileme hatası:", refreshErr);
          // Tablo yenileme başarısız olsa da işlemi başarılı say
        }
      }

      // ✅ onSuccess callback'i await et (handleStockUpdateSuccess async function'dır)
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      console.error("🔥 Stok ayarlama hatası:", err);
      
      // RLS veya auth hataları için ekstra debug
      if (err && typeof err === "object" && "code" in err) {
        console.error("Supabase Hata Kodu:", (err as any).code);
        console.error("Supabase Hata Hint:", (err as any).hint);
      }
      
      setError(errorMessage);
      toast.error(errorMessage, { duration: 3000 });
      setSaving(false);
      
      // İşlemi durdur - sayfa hiçbir şey değişmemiş gibi kalır
      return;
    }
  }

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" />

      {/* Modal kutusu */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-primary/20 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Başlık */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">swap_vert</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface">
                Stok Ayarla
              </h3>
              <p className="text-[11px] text-slate-400">
                "{productName}" ürününün stoğunu ayarla
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {/* Hata mesajı */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error-container/40 rounded-xl text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {/* Mevcut Stok (salt okunur) */}
          <div>
            <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
              Mevcut Stok (Salt Okunur)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline/50">
                inventory
              </span>
              <input
                type="number"
                value={currentStock}
                disabled
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-on-surface font-semibold cursor-not-allowed opacity-70"
              />
            </div>
          </div>

          {/* İşlem Tipi */}
          <div>
            <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
              İşlem Tipi
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: "add", label: "Artır (+)", icon: "add_circle" },
                { val: "subtract", label: "Azalt (-)", icon: "remove_circle" },
              ].map(({ val, label, icon }) => (
                <label
                  key={val}
                  className={`relative flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    operationType === val
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/20 hover:border-outline-variant/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="operationType"
                    value={val}
                    checked={operationType === (val as "add" | "subtract")}
                    onChange={(e) =>
                      setOperationType(e.target.value as "add" | "subtract")
                    }
                    className="hidden"
                  />
                  <span
                    className={`material-symbols-outlined text-lg ${
                      operationType === val
                        ? "text-primary"
                        : "text-outline-variant/50"
                    }`}
                  >
                    {icon}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      operationType === val
                        ? "text-primary"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Miktar */}
          <div>
            <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
              Miktar <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">
                {operationType === "add" ? "add" : "remove"}
              </span>
              <input
                ref={quantityInputRef}
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface font-semibold transition-all outline-none"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Not (Açıklama) */}
          <div>
            <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
              İşlem Notu (Opsiyonel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 rounded-lg text-on-surface text-sm transition-all outline-none resize-none"
              placeholder="Örn: Sayım farkı, Hasarlı ürün, Geri çekilen ürün..."
              rows={2}
            />
          </div>
        </form>

        {/* Butonlar */}
        <div className="px-6 py-4 bg-surface-container-low/30 border-t border-primary/20 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 text-on-surface font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">
                  progress_activity
                </span>
                Kaydediliyor...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  save
                </span>
                Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
