"use client";

import { useRef, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { softDeleteProduct } from "@/app/(dashboard)/trash/actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (productId: string) => void;
  productId: string;
  productName: string;
  userId?: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onSuccess,
  productId,
  productName,
  userId,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Modal açıldığında odakla
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDeleting(false);
      setTimeout(() => confirmButtonRef.current?.focus(), 50);
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

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      if (!productId || !userId) {
        throw new Error("Product ID veya User ID eksik!");
      }

      // ✅ Soft Delete — ürünü çöp kutusuna taşı (deleted_at = now())
      const result = await softDeleteProduct(productId, userId);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(`"${productName}" çöp kutusuna taşındı.`, {
        duration: 3000,
        icon: "🗑️",
      });

      onSuccess(productId);
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      console.error("❌ Silme işlemi hatası:", errorMessage);
      setError(errorMessage);
      toast.error(`Hata: ${errorMessage}`, { duration: 4000 });
      setDeleting(false);
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
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-amber-500/10 border border-amber-200/50 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Başlık */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">delete</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface">
                Çöp Kutusuna Taşı
              </h3>
              <p className="text-[11px] text-slate-400">30 gün içinde geri yüklenebilir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* İçerik */}
        <div className="px-6 py-5 space-y-4">
          {/* Hata mesajı */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error-container/40 rounded-xl text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {/* Uyarı mesajı */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200/50 rounded-xl">
            <span className="material-symbols-outlined text-amber-500 text-xl flex-shrink-0 mt-0.5">
              info
            </span>
            <div className="text-sm">
              <p className="font-bold text-on-surface mb-1">
                &ldquo;{productName}&rdquo; ürününü çöp kutusuna taşımak istediğinize emin misiniz?
              </p>
              <p className="text-xs text-slate-500">
                Ürün çöp kutusuna taşınacak ve <strong>30 gün</strong> boyunca geri yüklenebilir olacaktır.
                Çöp kutusundayken fatura oluşturmada kullanılamaz.
              </p>
            </div>
          </div>
        </div>

        {/* Butonlar */}
        <div className="px-6 py-4 bg-surface-container-low/30 border-t border-amber-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-2 text-on-surface font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-2 bg-amber-500 text-white font-bold text-sm rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">
                  progress_activity
                </span>
                Taşınıyor...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  delete
                </span>
                Çöp Kutusuna Taşı
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
