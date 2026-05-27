"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ActivityLogList from "@/components/activity-log/ActivityLogList";
import {
  listActivityLogs,
  getActivityLogStats,
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

const PAGE_SIZE = 10;

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
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0, month: 0 });
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

  // Fetch stats
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const statsData = await getActivityLogStats(userId);
      setStats(statsData);
    })();
  }, [userId]);

  // Fetch logs
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
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Toplam İşlem */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Toplam İşlem</p>
              <p className="text-3xl font-bold text-on-surface">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">history</span>
            </div>
          </div>
        </div>

        {/* Card 2: Bugün */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Bugün</p>
              <p className="text-3xl font-bold text-on-surface">{stats.today}</p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-2xl">today</span>
            </div>
          </div>
        </div>

        {/* Card 3: Bu Hafta */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Bu Hafta</p>
              <p className="text-3xl font-bold text-on-surface">{stats.week}</p>
            </div>
            <div className="w-12 h-12 bg-tertiary/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-2xl">calendar_month</span>
            </div>
          </div>
        </div>

        {/* Card 4: Bu Ay */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Bu Ay</p>
              <p className="text-3xl font-bold text-on-surface">{stats.month}</p>
            </div>
            <div className="w-12 h-12 bg-on-surface-variant/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">date_range</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant ml-1 mb-1.5 block">
              Modül
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(0); }}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
            >
              {MODULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant ml-1 mb-1.5 block">
              İşlem
            </label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant ml-1 mb-1.5 block">
              Başlangıç
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant ml-1 mb-1.5 block">
              Bitiş
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant ml-1 mb-1.5 block">
              Arama
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Kayıt veya kullanıcı..."
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Filtreleri Sıfırla
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline/5 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">
              progress_activity
            </span>
            <p className="text-sm text-on-surface-variant mt-2">Loglar yükleniyor...</p>
          </div>
        ) : (
          <ActivityLogList logs={logs} emptyMessage="Bu filtrelere uyan kayıt bulunamadı" />
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && total > 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline/5 flex items-center justify-between">
          <p className="text-sm font-medium text-on-surface">
            Toplam <span className="font-bold text-on-surface">{total}</span> işlemden <span className="font-bold text-on-surface">{logs.length}</span> tanesi gösteriliyor
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm min-w-12"
            >
              {page + 1}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
