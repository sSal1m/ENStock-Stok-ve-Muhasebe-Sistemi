"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ActivityLogList from "@/components/activity-log/ActivityLogList";
import {
  listActivityLogs,
  type ActivityLogRecord,
} from "@/app/(dashboard)/activity-log/actions";

const MODULE_OPTIONS = [
  { value: "all", label: "Tüm Modüller" },
  { value: "product", label: "Stok" },
  { value: "contact", label: "Cari" },
  { value: "invoice", label: "Fatura" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "Tüm İşlemler" },
  { value: "create", label: "Oluşturma" },
  { value: "update", label: "Güncelleme" },
  { value: "delete", label: "Silme" },
  { value: "restore", label: "Geri Yükleme" },
  { value: "permanent_delete", label: "Kalıcı Silme" },
  { value: "stock_adjust", label: "Stok Ayarlama" },
  { value: "balance_change", label: "Bakiye Değişimi" },
];

const PAGE_SIZE = 25;

export default function ActivityLogPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
    })();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    startTransition(async () => {
      const res = await listActivityLogs({
        userId,
        module: moduleFilter as any,
        action: actionFilter as any,
        search: search || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if (res.success) {
        setLogs(res.data);
        setTotal(res.total);
      }
      setLoading(false);
    });
  }, [userId, moduleFilter, actionFilter, search, startDate, endDate, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setModuleFilter("all");
    setActionFilter("all");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Özet İstatistikler */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-sm text-slate-500">
          Toplam <strong className="text-slate-900">{total}</strong> kayıt
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Modül
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {MODULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              İşlem
            </label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Başlangıç
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Bitiş
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Arama
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Kayıt veya kullanıcı..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Filtreleri Sıfırla
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">
              progress_activity
            </span>
            <p className="text-sm text-slate-500 mt-2">Loglar yükleniyor...</p>
          </div>
        ) : (
          <ActivityLogList logs={logs} emptyMessage="Bu filtrelere uyan kayıt bulunamadı" />
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">
            Sayfa <strong className="text-slate-900">{page + 1}</strong> / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-sm align-middle">chevron_left</span>
              Önceki
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki
              <span className="material-symbols-outlined text-sm align-middle">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
