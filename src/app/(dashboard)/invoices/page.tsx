"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import Link from "next/link";

interface Invoice {
  id: string;
  invoice_number: string;
  type: "sale" | "purchase";
  issue_date: string;
  total_amount: number;
  tax_total: number;
  status: string;
  contact_id: string;
  currency: string;
}

interface Contact {
  id: string;
  name: string;
}

export default function InvoicesPage() {
  const { viewCurrency, setViewCurrency, convert, format } = useCurrencyConverter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "sales" | "purchase">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInvoices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("issue_date", { ascending: false });

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      setLoading(false);
      return;
    }

    setInvoices((invoicesData || []) as Invoice[]);

    // Fetch contacts for mapping
    if (invoicesData && invoicesData.length > 0) {
      const contactIds = [...new Set(invoicesData.map((i: any) => i.contact_id))];
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("id, name")
        .in("id", contactIds);

      const contactMap: Record<string, string> = {};
      (contactsData || []).forEach((c: any) => {
        contactMap[c.id] = c.name;
      });
      setContacts(contactMap);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filtered = invoices.filter((invoice) => {
    const typeMatch = filterType === "all" || invoice.type === (filterType === "sales" ? "sale" : filterType === "purchase" ? "purchase" : invoice.type);
    const searchMatch =
      invoice.invoice_number.toString().includes(searchTerm) ||
      (contacts[invoice.contact_id]?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return typeMatch && searchMatch;
  });

  const calculateInView = (amountTry: number) => {
    return convert(amountTry); // Hook'un convert fonksiyonunu kullanıyoruz (TRY -> viewCurrency)
  };

  const totalAmount = filtered.reduce((sum, inv) => sum + calculateInView(inv.total_amount), 0);
  const vatAmount = filtered.reduce((sum, inv) => sum + calculateInView(inv.tax_total), 0);

  return (
    <div className="w-full p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      {/* Content Area */}
      <div className="w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Faturalar
            </h1>
            <p className="text-slate-600">
              Tüm faturalarınızı yönetin ve takip edin
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             {/* Döviz Görünüm Seçici */}
             <div className="flex items-center gap-2 bg-white border-2 border-purple-100 rounded-xl px-4 py-2.5 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Görünüm:</span>
                <select
                  value={viewCurrency}
                  onChange={(e) => setViewCurrency(e.target.value)}
                  className="bg-transparent border-none text-sm font-black text-purple-600 outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

            <Link
              href="/invoices/new"
              className="flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Yeni Fatura
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 pb-6 border-b border-slate-200">
          <button
            onClick={() => setFilterType("all")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              filterType === "all"
                ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
            }`}
          >
            <span className="material-symbols-outlined align-middle mr-2 text-lg">list</span>
            Hepsi
          </button>
          <button
            onClick={() => setFilterType("sales")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              filterType === "sales"
                ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
            }`}
          >
            <span className="material-symbols-outlined align-middle mr-2 text-lg">trending_up</span>
            Satış
          </button>
          <button
            onClick={() => setFilterType("purchase")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              filterType === "purchase"
                ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
            }`}
          >
            <span className="material-symbols-outlined align-middle mr-2 text-lg">trending_down</span>
            Alış
          </button>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              Ara
            </label>
            <div className="flex items-center bg-white border-2 border-slate-300 rounded-lg px-4 py-3 focus-within:border-purple-400 transition-all">
              <span className="material-symbols-outlined text-slate-400">search</span>
              <input
                className="w-full bg-transparent border-none focus:ring-0 py-2 text-sm placeholder:text-slate-400"
                placeholder="Fatura no veya cari adı yazın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Stat Cards */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
                  Toplam KDV
                </p>
                <p className="font-bold text-2xl text-orange-700">{format(vatAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-200/50 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-orange-600">receipt_long</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                  Toplam Tutar
                </p>
                <p className="font-bold text-2xl text-green-700">{format(totalAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-green-200/50 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-green-600">payments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-slate-600 text-sm">Faturalar yükleniyor...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center mb-8 shadow-sm">
              <span className="material-symbols-outlined text-7xl text-purple-400">receipt_long</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Henüz fatura kesilmemiş</h3>
            <p className="text-slate-600 mb-8 max-w-sm text-center">Yeni bir fatura oluşturmak için aşağıdaki butona tıklayın</p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-base text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              İlk Faturayı Oluştur
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Fatura No
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Cari Adı
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Tür
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600 text-right">
                    Tutar
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Durum
                  </th>
                  <th className="px-6 py-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        FTR-{new Date(invoice.issue_date).getFullYear()}-{invoice.invoice_number
                          .toString()
                          .padStart(3, "0")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{contacts[invoice.contact_id] || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 w-fit ${
                          invoice.type === "sale"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {invoice.type === "sale" ? "trending_up" : "trending_down"}
                        </span>
                        {invoice.type === "sale" ? "Satış" : "Alış"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">
                        {new Date(invoice.issue_date).toLocaleDateString("tr-TR")}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-semibold text-slate-900">{format(calculateInView(invoice.total_amount))}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 w-fit ${
                        invoice.status === "draft" ? "bg-slate-100 text-slate-700" : invoice.status === "pending" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {invoice.status === "draft" ? "description" : invoice.status === "pending" ? "schedule" : "check_circle"}
                        </span>
                        {invoice.status === "draft" ? "📝 TASLAK" : invoice.status === "pending" ? "⏳ BEKLIYOR" : "✅ ÖDENDİ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={invoice.status === "draft" ? `/invoices/new?id=${invoice.id}` : `/invoices/${invoice.id}`}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-purple-600 hover:bg-purple-100 transition-all"
                        title={invoice.status === "draft" ? "Taslak faturayı düzenle" : "Fatura detaylarını görüntüle"}
                      >
                        <span className="material-symbols-outlined">
                          {invoice.status === "draft" ? "edit" : "arrow_forward"}
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
