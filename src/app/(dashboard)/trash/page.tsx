"use client";

import { useState, useEffect, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import {
  getTrashItems,
  restoreProduct,
  restoreContact,
  restoreInvoice,
  restoreQuote,
  permanentDeleteProduct,
  permanentDeleteContact,
  permanentDeleteInvoice,
  permanentDeleteQuote,
  emptyTrash,
  type TrashItem,
} from "./actions";

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const TABS = ["Tümü", "Ürünler", "Cariler", "Faturalar", "Teklifler"] as const;
type Tab = (typeof TABS)[number];

const typeLabels: Record<TrashItem["type"], string> = {
  product: "Ürün",
  contact: "Cari",
  invoice: "Fatura",
  quote: "Teklif",
};

const typeIcons: Record<TrashItem["type"], string> = {
  product: "inventory_2",
  contact: "contacts",
  invoice: "receipt",
  quote: "request_quote",
};

const typeBgColors: Record<TrashItem["type"], string> = {
  product: "bg-indigo-50 text-indigo-600",
  contact: "bg-emerald-50 text-emerald-600",
  invoice: "bg-purple-50 text-purple-600",
  quote: "bg-orange-50 text-orange-600",
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Tümü");
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);

  // ── Kullanıcı ve verileri çek ──
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const result = await getTrashItems(user.id);
      if (result.success) {
        setItems(result.data);
      } else {
        toast.error(result.message || "Çöp kutusu yüklenemedi.");
      }
      setLoading(false);
    }
    init();
  }, []);

  // ── Filtrele ──
  const filtered = items.filter((item) => {
    if (activeTab === "Tümü") return true;
    if (activeTab === "Ürünler") return item.type === "product";
    if (activeTab === "Cariler") return item.type === "contact";
    if (activeTab === "Faturalar") return item.type === "invoice";
    if (activeTab === "Teklifler") return item.type === "quote";
    return true;
  });

  // ── Geri Yükle ──
  const handleRestore = (item: TrashItem) => {
    if (!userId) return;
    startTransition(async () => {
      let result;
      if (item.type === "product") result = await restoreProduct(item.id, userId);
      else if (item.type === "contact") result = await restoreContact(item.id, userId);
      else if (item.type === "invoice") result = await restoreInvoice(item.id, userId);
      else result = await restoreQuote(item.id, userId);

      if (result.success) {
        toast.success(result.message, { icon: "♻️" });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        toast.error(result.message);
      }
    });
  };

  // ── Kalıcı Sil ──
  const handlePermanentDelete = (item: TrashItem) => {
    if (!userId) return;
    startTransition(async () => {
      let result;
      if (item.type === "product") result = await permanentDeleteProduct(item.id, userId);
      else if (item.type === "contact") result = await permanentDeleteContact(item.id, userId);
      else if (item.type === "invoice") result = await permanentDeleteInvoice(item.id, userId);
      else result = await permanentDeleteQuote(item.id, userId);

      if (result.success) {
        toast.success(result.message, { icon: "🗑️" });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setConfirmDeleteId(null);
      } else {
        toast.error(result.message);
      }
    });
  };

  // ── Çöp Kutusunu Boşalt ──
  const handleEmptyTrash = () => {
    if (!userId) return;
    startTransition(async () => {
      const result = await emptyTrash(userId);
      if (result.success) {
        toast.success(result.message, { icon: "🗑️" });
        setItems([]);
        setConfirmEmptyAll(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  // ── Yardımcılar ──
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysColor = (days: number) => {
    if (days <= 3) return "text-red-600 bg-red-50";
    if (days <= 7) return "text-amber-600 bg-amber-50";
    return "text-slate-600 bg-slate-50";
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* ── Sayfa Başlığı ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
            <span>Panel</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-slate-500">Çöp Kutusu</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            Çöp Kutusu
          </h1>
          <p className="text-slate-500 mt-1">
            Silinen kayıtlar 30 gün boyunca burada saklanır. Süre dolduğunda kalıcı olarak silinir.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button
              onClick={() => setConfirmEmptyAll(true)}
              disabled={isPending}
              className="border-2 border-red-200 text-red-600 px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              <span>Çöp Kutusunu Boşalt</span>
            </button>
          )}
        </div>
      </div>

      {/* ── İstatistik Kartları ── */}
      <section className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-slate-800 tabular-nums leading-none">{items.length}</p>
            <span className="mb-0.5 text-[11px] font-bold text-slate-400">kayıt</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ürünler</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-indigo-600 tabular-nums leading-none">
              {items.filter((i) => i.type === "product").length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cariler</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-emerald-600 tabular-nums leading-none">
              {items.filter((i) => i.type === "contact").length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Faturalar</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-purple-600 tabular-nums leading-none">
              {items.filter((i) => i.type === "invoice").length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Teklifler</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold text-orange-600 tabular-nums leading-none">
              {items.filter((i) => i.type === "quote").length}
            </p>
          </div>
        </div>
      </section>

      {/* ── TABLE CARD ── */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-50/50">
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-indigo-50 px-8 pt-5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3.5 text-sm font-bold transition-all ${
                activeTab === tab
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-primary" />
              )}
            </button>
          ))}
          <span className="ml-auto pb-3.5 text-xs font-bold text-slate-300">
            {filtered.length} kayıt bulundu
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Kayıt Adı
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Tür
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Detay
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Silinme Tarihi
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">
                  Kalan Süre
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-center animate-pulse text-slate-400">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-300 text-5xl">delete_forever</span>
                      </div>
                      <div>
                        <p className="text-slate-600 font-bold text-lg">Çöp kutusu boş</p>
                        <p className="text-slate-400 text-sm mt-1">Silinen kayıtlar burada görünecektir.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="group hover:bg-indigo-50/20 transition-colors">
                    {/* Kayıt Adı */}
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeBgColors[item.type]}`}>
                          <span className="material-symbols-outlined text-lg">{typeIcons[item.type]}</span>
                        </div>
                        <span className="font-bold text-on-surface">{item.name}</span>
                      </div>
                    </td>

                    {/* Tür */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${typeBgColors[item.type]}`}>
                        {typeLabels[item.type]}
                      </span>
                    </td>

                    {/* Detay */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-500 font-medium">{item.detail}</p>
                    </td>

                    {/* Silinme Tarihi */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600 font-medium">{formatDate(item.deleted_at)}</p>
                    </td>

                    {/* Kalan Süre */}
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${getDaysColor(item.days_remaining)}`}>
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {item.days_remaining} gün
                      </span>
                    </td>

                    {/* İşlemler */}
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all disabled:opacity-50"
                          title="Geri Yükle"
                        >
                          <span className="material-symbols-outlined text-sm">restore</span>
                          Geri Yükle
                        </button>

                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePermanentDelete(item)}
                              disabled={isPending}
                              className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                              Onayla
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all disabled:opacity-50"
                            title="Kalıcı Sil"
                          >
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                            Kalıcı Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 30 Gün Bilgilendirme ── */}
      <div className="bg-amber-50/60 border border-amber-200/50 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-amber-600">info</span>
        </div>
        <div>
          <p className="font-bold text-amber-800 text-sm">Otomatik Temizleme Bilgisi</p>
          <p className="text-amber-700 text-xs mt-1 leading-relaxed">
            Çöp kutusundaki kayıtlar silindikten <strong>30 gün</strong> sonra kalıcı olarak kaldırılır. 
            Geri yüklenen kayıtlar tekrar kullanılabilir hale gelir (ürünler stok listesinde, cariler fatura 
            oluşturmada aranabilir olur).
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="pt-8 text-center border-t border-indigo-50/50">
        <p className="text-slate-400 text-xs font-bold">
          © 2026 KOBİ Hesap Sistemi · Çöp Kutusu
        </p>
      </footer>

      {/* ── Çöp Kutusunu Boşalt Onay Modalı ── */}
      {confirmEmptyAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmEmptyAll(false);
          }}
        >
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-red-500/10 border border-red-100">
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">delete_sweep</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">
                    Çöp Kutusunu Boşalt
                  </h3>
                  <p className="text-[11px] text-slate-400">Bu işlem geri alınamaz</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmEmptyAll(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="material-symbols-outlined text-red-500 text-xl flex-shrink-0 mt-0.5">
                  warning
                </span>
                <div className="text-sm">
                  <p className="font-bold text-on-surface mb-1">
                    Çöp kutusundaki <strong>{items.length}</strong> kayıt kalıcı olarak silinecektir.
                  </p>
                  <p className="text-xs text-slate-500">
                    Bu işlem geri alınamaz. Tüm ürünler, cariler ve faturalar kalıcı olarak kaldırılacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-red-100 flex gap-3 justify-end rounded-b-2xl">
              <button
                onClick={() => setConfirmEmptyAll(false)}
                disabled={isPending}
                className="px-6 py-2 text-on-surface font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={isPending}
                className="px-6 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    Siliniyor...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">delete_sweep</span>
                    Hepsini Sil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#363636",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
          },
        }}
      />
    </div>
  );
}
