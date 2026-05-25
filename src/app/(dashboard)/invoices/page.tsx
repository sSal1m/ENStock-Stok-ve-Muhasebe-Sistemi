"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { softDeleteInvoice } from "@/app/(dashboard)/trash/actions";
import Link from "next/link";
import toast from "react-hot-toast";


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
  is_paid?: boolean;
  due_date?: string;
}

interface Contact {
  id: string;
  name: string;
}

export default function InvoicesPage() {
  const { viewCurrency, setViewCurrency, convertFull, format } = useCurrencyConverter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "sales" | "purchase">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  const fetchInvoices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { fetchTeamScopedData } = await import("@/app/(dashboard)/teamActions");
      
      // Fetch invoices (team-scoped)
      const { data: invoicesData } = await fetchTeamScopedData(user.id, "invoices", "*", {
        excludeDeleted: true,
        orderBy: "issue_date",
        orderAscending: false
      });

      setInvoices((invoicesData || []) as Invoice[]);

      // Fetch contacts for mapping (team-scoped)
      if (invoicesData && invoicesData.length > 0) {
        const contactIds = [...new Set(invoicesData.map((i: any) => i.contact_id))];
        const { data: contactsData } = await fetchTeamScopedData(user.id, "contacts", "id, name", {
          excludeDeleted: false
        });

        const contactMap: Record<string, string> = {};
        // Only map contacts that exist
        (contactsData || []).forEach((c: any) => {
          contactMap[c.id] = c.name;
        });
        setContacts(contactMap);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const isOverdue = (invoice: Invoice) => {
    if (invoice.is_paid === true || invoice.status === "paid") return false;
    if (!invoice.due_date) return false;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const filtered = invoices.filter((invoice) => {
    const typeMatch = filterType === "all" || invoice.type === (filterType === "sales" ? "sale" : filterType === "purchase" ? "purchase" : invoice.type);
    
    if (!searchTerm.trim()) {
      return typeMatch;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const searchMatch =
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      (contacts[invoice.contact_id]?.toLowerCase().includes(searchLower) ?? false);
    return typeMatch && searchMatch;
  });

  // Fatura tutarları faturanın kendi para biriminde saklanır.
  // Her faturayı kendi currency'sinden viewCurrency'ye çevirip topluyoruz —
  // böylece TRY + USD + EUR faturalar doğru toplam verir.
  const calculateInView = (amount: number, fromCurrency: string | null | undefined) => {
    return convertFull(amount, fromCurrency || "TRY", viewCurrency);
  };

  const totalAmount = filtered.reduce(
    (sum, inv) => sum + calculateInView(inv.total_amount, inv.currency),
    0
  );
  const vatAmount = filtered.reduce(
    (sum, inv) => sum + calculateInView(inv.tax_total, inv.currency),
    0
  );

  const handleDownloadPdf = async (invoice: Invoice) => {
    setDownloadingPdfId(invoice.id);
    const toastId = toast.loading("PDF hazırlanıyor...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı");

      // 1. Get Business Info
      let companyName = "Şirket Adı Belirtilmemiş";
      let companyAddress = "";
      let companyTaxId = "";
      const localSettingsRaw = localStorage.getItem(`business_settings_${user.id}`);
      if (localSettingsRaw) {
        const localSettings = JSON.parse(localSettingsRaw);
        companyName = localSettings.companyName || companyName;
        companyAddress = localSettings.address || "";
        companyTaxId = localSettings.taxId || "";
      } else {
        const { data: profile } = await supabase.from("profiles").select("company_name, tax_id").eq("id", user.id).single();
        if (profile) {
          companyName = profile.company_name || companyName;
          companyTaxId = profile.tax_id || "";
        }
      }

      // 2. Get Contact Info
      const { data: contactData } = await supabase.from("contacts").select("*").eq("id", invoice.contact_id).single();
      
      // 3. Get Invoice Items and Products
      const { data: itemsData } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
      
      const formattedItems = [];
      if (itemsData && itemsData.length > 0) {
        for (const item of itemsData) {
          const { data: product } = await supabase.from("products").select("name").eq("id", item.product_id).single();
          formattedItems.push({
            productName: product?.name || "Bilinmeyen Ürün",
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            vatRate: Number(item.vat_rate),
            lineTotal: Number(item.line_total),
          });
        }
      }

      // Generate Data Object
      const pdfData = {
        companyName,
        companyAddress,
        companyTaxId,
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date,
        currency: invoice.currency || "TRY",
        status: invoice.status,
        contactName: contactData?.name || "Cari Belirtilmemiş",
        contactTaxNumber: contactData?.tax_number,
        contactTaxOffice: contactData?.tax_office,
        items: formattedItems,
        subtotal: invoice.total_amount - invoice.tax_total,
        vatTotal: invoice.tax_total,
        grandTotal: invoice.total_amount,
      };

      const { data: fullInvoice } = await supabase.from("invoices").select("notes").eq("id", invoice.id).single();
      if (fullInvoice && fullInvoice.notes) (pdfData as any).notes = fullInvoice.notes;

      const { generateInvoicePdf } = await import("@/lib/generateInvoicePdf");
      await generateInvoicePdf(pdfData, invoice.status === "draft" ? "quotation" : "invoice");
      toast.success("PDF başarıyla oluşturuldu.", { id: toastId });

    } catch (err: any) {
      console.error("PDF Generate error:", err);
      toast.error(`Aksiyon hatası: ${err.message}`, { id: toastId });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Pagination
  const paginatedInvoices = filtered.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="w-full p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      {/* Content Area */}
      <div className="w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <nav className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
              <span>Panel</span>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="text-slate-500">Fatura Yönetimi</span>
            </nav>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Faturalar
            </h1>
            <p className="text-slate-600 mt-1">
              Tüm faturalarınızı yönetin ve takip edin.
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
            <div className="w-32 h-32 mb-8 relative flex items-center justify-center rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md hover:scale-105 transition-transform duration-300">
              <img
                src="/fatura.png"
                alt="Fatura"
                className="w-full h-full object-cover scale-[1.38]"
              />
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
          <div className="space-y-4">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-indigo-50">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="w-[160px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Fatura No</th>
                      <th className="w-[150px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Cari Adı</th>
                      <th className="w-[100px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Tür</th>
                      <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Tarih</th>
                      <th className="w-[130px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-right">Tutar</th>
                      <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Durum</th>
                      <th className="w-[100px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50/50">
                    {paginatedInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-indigo-50/30 transition-colors align-middle">
                        <td className="w-[160px] px-6 py-5 align-middle">
                          <p className="text-sm font-semibold text-on-surface">
                            {invoice.invoice_number}
                          </p>
                        </td>
                        <td className="w-[150px] px-6 py-5 align-middle">
                          <p className="text-sm font-medium text-slate-700 truncate">{contacts[invoice.contact_id] || "—"}</p>
                        </td>
                        <td className="w-[100px] px-6 py-5 align-middle">
                          <span
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
                              invoice.type === "sale"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-indigo-50 text-indigo-700"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {invoice.type === "sale" ? "trending_up" : "trending_down"}
                            </span>
                            {invoice.type === "sale" ? "Satış" : "Alış"}
                          </span>
                        </td>
                        <td className="w-[120px] px-6 py-5 align-middle">
                          <p className="text-sm text-slate-700 font-medium">
                            {new Date(invoice.issue_date).toLocaleDateString("tr-TR")}
                          </p>
                        </td>
                        <td className="w-[130px] px-6 py-5 align-middle text-right">
                          <p className="text-sm font-semibold text-on-surface">{format(calculateInView(invoice.total_amount, invoice.currency))}</p>
                        </td>
                        <td className="w-[120px] px-6 py-5 align-middle">
                          {invoice.status === "draft" ? (
                            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">description</span>
                              TASLAK
                            </span>
                          ) : invoice.is_paid === true || invoice.status === "paid" ? (
                            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              ÖDENDİ
                            </span>
                          ) : isOverdue(invoice) ? (
                            <span className="bg-red-100 text-red-700 text-xs font-extrabold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              VADESİ GEÇTİ
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              BEKLİYOR
                            </span>
                          )}
                        </td>
                        <td className="w-[100px] px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDownloadPdf(invoice)}
                              disabled={downloadingPdfId === invoice.id}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                              title="PDF Olarak İndir"
                            >
                              <span className={`material-symbols-outlined ${downloadingPdfId === invoice.id ? 'animate-pulse' : ''}`}>
                                {downloadingPdfId === invoice.id ? 'sync' : 'picture_as_pdf'}
                              </span>
                            </button>
                            <Link
                              href={`/invoices/new?id=${invoice.id}`}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-primary hover:bg-primary/10 transition-all"
                              title="Faturayı düzenle"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </Link>
                            <button
                              onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) { toast.error("Oturum açma gerekli."); return; }
                                const result = await softDeleteInvoice(invoice.id, user.id);
                                if (result.success) {
                                  toast.success(`Fatura çöp kutusuna taşındı.`, { icon: "🗑️" });
                                  setInvoices(prev => prev.filter(x => x.id !== invoice.id));
                                } else {
                                  toast.error(result.message);
                                }
                              }}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-amber-500 hover:bg-amber-50 transition-all"
                              title="Çöp Kutusuna Taşı"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-5 bg-surface-container-low/30 border-t border-indigo-50 flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  {filtered.length === 0
                    ? "Kayıt bulunamadı"
                    : `${paginatedInvoices.length} / ${filtered.length} fatura gösteriliyor (Sayfa ${currentPage + 1})`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-indigo-50 transition-all bg-white flex items-center gap-2 disabled:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 enabled:text-primary enabled:hover:bg-indigo-50"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={(currentPage + 1) * ITEMS_PER_PAGE >= filtered.length}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-indigo-50 transition-all bg-white flex items-center gap-2 disabled:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 enabled:text-primary enabled:hover:bg-indigo-50"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    Sonraki
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
