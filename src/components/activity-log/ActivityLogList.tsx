"use client";

import Link from "next/link";
import type { ActivityLogRecord } from "@/app/(dashboard)/activity-log/actions";

interface Props {
  logs: ActivityLogRecord[];
  compact?: boolean;
  emptyMessage?: string;
}

const MODULE_LABEL: Record<string, string> = {
  product: "Stok",
  contact: "Cari",
  invoice: "Fatura",
};

const MODULE_ICON: Record<string, string> = {
  product: "inventory_2",
  contact: "contacts",
  invoice: "receipt",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Oluşturma",
  update: "Güncelleme",
  delete: "Silme",
  restore: "Geri Yükleme",
  permanent_delete: "Kalıcı Silme",
  stock_adjust: "Stok Ayarlama",
  balance_change: "Bakiye Değişimi",
};

function actionColor(action: string) {
  switch (action) {
    case "create":
      return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
    case "update":
      return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" };
    case "delete":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
    case "permanent_delete":
      return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" };
    case "restore":
      return { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500" };
    case "stock_adjust":
      return { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" };
    case "balance_change":
      return { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" };
  }
}

function entityHref(log: ActivityLogRecord): string | null {
  if (!log.entity_id) return null;
  if (log.action === "permanent_delete" || log.action === "delete") return null;
  if (log.module === "product") return `/inventory/${log.entity_id}`;
  if (log.module === "contact") return `/contacts/${log.entity_id}`;
  if (log.module === "invoice") return `/invoices/${log.entity_id}`;
  return null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function ActivityLogList({ logs, compact = false, emptyMessage }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-slate-300 text-4xl">history</span>
        <p className="text-sm text-slate-500 mt-2">
          {emptyMessage ?? "Henüz aktivite kaydı yok"}
        </p>
      </div>
    );
  }

  return (
    <ul className={`divide-y divide-slate-100 ${compact ? "" : "border border-slate-100 rounded-xl overflow-hidden bg-white"}`}>
      {logs.map((log) => {
        const colors = actionColor(log.action);
        const href = entityHref(log);

        const content = (
          <div className={`flex items-start gap-3 ${compact ? "py-3 px-2" : "py-4 px-5"} hover:bg-slate-50/60 transition-colors`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
              <span className={`material-symbols-outlined text-lg ${colors.text}`}>
                {MODULE_ICON[log.module] ?? "history"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  {MODULE_LABEL[log.module] ?? log.module} · {ACTION_LABEL[log.action] ?? log.action}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDate(log.created_at)}
                </span>
              </div>
              <p className="text-sm text-slate-800 font-medium truncate">
                {log.description ?? `${MODULE_LABEL[log.module]} ${ACTION_LABEL[log.action]}`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">person</span>
                {log.user_name || log.user_email || "Bilinmeyen kullanıcı"}
              </p>
            </div>
          </div>
        );

        return (
          <li key={log.id}>
            {href ? (
              <Link href={href} className="block">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
