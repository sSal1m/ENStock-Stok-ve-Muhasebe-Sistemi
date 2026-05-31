"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { softDeleteQuote } from "@/app/(dashboard)/trash/actions";
import { createInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchTeamQuotes } from "./actions";

interface Quote {
  id: string;
  quote_number: string;
  quote_date?: string;
  issue_date?: string;
  total_amount: number;
  tax_total: number;
  currency?: string | null;
  exchange_rate?: number | null;
  status: string;
  contact_id: string;
  created_at?: string;
  contacts?: {
    name: string;
  };
}

export default function QuotesPage() {
  const { hasPermission } = usePermissions();
  const { viewCurrency, setViewCurrency, convertFull, format: fmt } = useCurrencyConverter();
  const convertQuote = (amount: number, fromCurrency: string | null | undefined) =>
    convertFull(amount, fromCurrency || "TRY", viewCurrency);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const router = useRouter();

  const fetchQuotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const res = await fetchTeamQuotes(user.id);

    if (!res.success) {
      toast.error("Teklifler yuklenirken bir hata olustu.");
      setLoading(false);
      return;
    }

    const normalizedQuotes = (res.quotes || []) as Quote[];
    normalizedQuotes.sort((a, b) => {
      const aDate = a.issue_date || a.quote_date || a.created_at || "";
      const bDate = b.issue_date || b.quote_date || b.created_at || "";
      return bDate.localeCompare(aDate);
    });

    setQuotes(normalizedQuotes);
    setContacts(res.contacts || {});

    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const toastId = toast.loading("Onaylaniyor...");
    const { error } = await supabase
      .from("quotes")
      .update({ status: "Approved" })
      .eq("id", id);

    if (error) {
      console.error("Error approving quote:", error);
      toast.error("Teklif onaylanirken hata olustu.", { id: toastId });
    } else {
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status: "Approved" } : q)));
      toast.success("Teklif basariyla onaylandi.", { id: toastId });
    }
    setActionLoading(null);
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    setActionLoading(quote.id + "_convert");
    const toastId = toast.loading("Stok kontrol ediliyor ve faturaya donusturuluyor...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadi");

      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quote.id)
        .single();

      if (quoteError) throw quoteError;

      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      if (!quoteItems || quoteItems.length === 0) {
        throw new Error("Teklifte hic urun bulunamadi.");
      }

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const invoiceNumber = `FTR-${year}-${month}-${day}-${randomNum}`;

      // Call createInvoiceAction to handle everything including stock & balance
      const actionResult = await createInvoiceAction({
        user_id: user.id,
        contact_id: quoteData.contact_id,
        invoice_type: "sales",
        issue_date: new Date().toISOString().split("T")[0],
        notes: quoteData.notes || "",
        line_items: quoteItems.map((item: any) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
        })),
        status: "pending",
        invoice_number: invoiceNumber,
        currency: quoteData.currency || "TRY",
        exchange_rate: quoteData.exchange_rate || 1,
      });

      if (!actionResult.success) {
        const errorMsg = actionResult.errors ? Object.values(actionResult.errors).join(", ") : actionResult.message;
        throw new Error(errorMsg);
      }

      // Update quote status to prevent double conversion
      const { error: updateError } = await supabase
        .from("quotes")
        .update({ status: "Invoiced" })
        .eq("id", quote.id);

      if (updateError) {
        console.error("Error updating quote status:", updateError);
        // We won't throw here to not revert the invoice success toast, but we should notify
        toast.error("Fatura olusturuldu ancak teklif durumu guncellenemedi.", { id: toastId });
      } else {
        setQuotes((prev) => prev.map((q) => (q.id === quote.id ? { ...q, status: "Invoiced" } : q)));
        toast.success("Fatura basariyla olusturuldu!", { id: toastId });
      }

      router.push("/invoices");
    } catch (error: any) {
      console.error("Error converting to invoice:", error);
      toast.error(`Hata: ${error.message || "Faturaya donusturulemedi"}`, { id: toastId });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async (quote: Quote) => {
    setDownloadingPdfId(quote.id);
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
      const { data: contactData } = await supabase.from("contacts").select("*").eq("id", quote.contact_id).single();

      // 3. Get Quote Items and Products
      const { data: itemsData } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id);

      const formattedItems = [];
      if (itemsData && itemsData.length > 0) {
        for (const item of itemsData) {
          const { data: product } = await supabase.from("products").select("name").eq("id", item.product_id).single();
          const lineSubtotal = item.quantity * item.unit_price;
          const lineVat = lineSubtotal * (item.vat_rate / 100);
          formattedItems.push({
            productName: product?.name || "Bilinmeyen Ürün",
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            vatRate: Number(item.vat_rate),
            lineTotal: Number(lineSubtotal + lineVat),
          });
        }
      }

      // Generate Data Object
      const pdfData = {
        companyName,
        companyAddress,
        companyTaxId,
        invoiceNumber: quote.quote_number,
        issueDate: quote.issue_date || quote.quote_date || "",
        currency: "TRY",
        status: quote.status,
        contactName: contactData?.name || "Cari Belirtilmemiş",
        contactTaxNumber: contactData?.tax_number,
        contactTaxOffice: contactData?.tax_office,
        items: formattedItems,
        subtotal: quote.total_amount - (quote.tax_total || 0),
        vatTotal: quote.tax_total || 0,
        grandTotal: quote.total_amount,
      };

      const { data: fullQuote } = await supabase.from("quotes").select("notes").eq("id", quote.id).single();
      if (fullQuote && fullQuote.notes) (pdfData as any).notes = fullQuote.notes;

      const { generateInvoicePdf } = await import("@/lib/generateInvoicePdf");
      await generateInvoicePdf(pdfData, "quotation");
      toast.success("PDF başarıyla oluşturuldu.", { id: toastId });

    } catch (err: any) {
      console.error("PDF Generate error:", err);
      toast.error(`Aksiyon hatası: ${err.message}`, { id: toastId });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const filtered = quotes.filter((quote) => {
    const statusLower = quote.status?.toLowerCase() || "";
    let isMatch = true;
    if (filterType === "pending") isMatch = statusLower === "pending" || statusLower === "beklemede";
    if (filterType === "approved") isMatch = statusLower === "approved" || statusLower === "onaylandi";
    if (filterType === "rejected") isMatch = statusLower === "rejected" || statusLower === "reddedildi";

    if (!searchTerm.trim()) return filterType === "all" || isMatch;

    const searchLower = searchTerm.toLowerCase().trim();
    const contactName =
      contacts[quote.contact_id]?.toLowerCase() ||
      quote.contacts?.name?.toLowerCase() ||
      "";

    const searchMatch =
      (quote.quote_number?.toLowerCase() || "").includes(searchLower) ||
      contactName.includes(searchLower);

    return (filterType === "all" || isMatch) && searchMatch;
  });

  // Teklifler farklı para birimlerinde olabilir; her birini kendi currency'sinden
  // viewCurrency'ye çevirip topluyoruz.
  const totalAmount = filtered.reduce(
    (sum, q) => sum + convertQuote(q.total_amount || 0, q.currency),
    0
  );
  const vatAmount = filtered.reduce(
    (sum, q) => sum + convertQuote(q.tax_total || 0, q.currency),
    0
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedQuotes = filtered.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // Stat kartları için hesaplamalar
  const pendingQuotes = filtered.filter((q) => (q.status?.toLowerCase() || "").includes("pending") || (q.status?.toLowerCase() || "").includes("beklemede")).length;
  const approvedQuotes = filtered.filter((q) => (q.status?.toLowerCase() || "").includes("approved") || (q.status?.toLowerCase() || "").includes("onaylandi")).length;
  const rejectedQuotes = filtered.filter((q) => (q.status?.toLowerCase() || "").includes("rejected") || (q.status?.toLowerCase() || "").includes("reddedildi")).length;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <Toaster position="top-right" />
      <div className="w-full space-y-8">
        {/* ── İstatistik Kartları ── */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Toplam Teklif */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Teklif</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-2xl font-extrabold text-purple-600 tabular-nums leading-none">{quotes.length}</p>
              <span className="mb-0.5 text-[11px] font-bold text-purple-500">
                teklif
              </span>
            </div>
          </div>

          {/* Beklemede */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Beklemede</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-2xl font-extrabold text-orange-600 tabular-nums leading-none">{pendingQuotes}</p>
              <span className="mb-0.5 text-[11px] font-bold text-orange-500">
                bekleme
              </span>
            </div>
          </div>

          {/* Onaylanan */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Onaylanan</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-2xl font-extrabold text-green-600 tabular-nums leading-none">{approvedQuotes}</p>
              <span className="mb-0.5 text-[11px] font-bold text-green-500">
                onay
              </span>
            </div>
          </div>

          {/* Toplam Tutar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50/50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Tutar</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-2xl font-extrabold text-emerald-600 tabular-nums leading-none">{fmt(totalAmount)}</p>
              <span className="mb-0.5 text-[11px] font-bold text-emerald-500">
                tutar
              </span>
            </div>
          </div>
        </section>

        {/* Tab Filtresi */}
        <div className="flex justify-between items-center w-full border-b border-slate-200 pb-2 mb-6">
          {/* Sol Taraf: Sekmeler */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setFilterType("all"); setCurrentPage(0); }}
              className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 ${
                filterType === "all"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Hepsi
            </button>
            <button
              onClick={() => { setFilterType("pending"); setCurrentPage(0); }}
              className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 ${
                filterType === "pending"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Beklemede
            </button>
            <button
              onClick={() => { setFilterType("approved"); setCurrentPage(0); }}
              className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 ${
                filterType === "approved"
                  ? "border-green-500 text-green-500"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Onaylandi
            </button>
            <button
              onClick={() => { setFilterType("rejected"); setCurrentPage(0); }}
              className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 ${
                filterType === "rejected"
                  ? "border-red-500 text-red-500"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Reddedildi
            </button>
          </div>

          {/* Sağ Taraf: Döviz + Yeni Teklif */}
          <div className="flex items-center gap-3">
            {/* Döviz Seçici */}
            <div className="flex items-center gap-2 bg-white border-2 border-purple-100 rounded-xl px-4 py-2 shadow-sm">
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

            {/* Grid/List Görünümü */}
            {/* Yeni Teklif Butonu */}
            {hasPermission("quotes", "create") && (
              <Link
                href="/quotes/new"
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Yeni Teklif
              </Link>
            )}
          </div>
        </div>

        {/* Filtreler & Arama */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-purple-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm outline-none bg-white"
              placeholder="Teklif no veya müşteri adı yazın..."
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-slate-600 text-sm">Teklifler yukleniyor...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-32 h-32 mb-8 relative flex items-center justify-center rounded-full overflow-hidden bg-white border border-slate-200 shadow-md hover:scale-105 transition-transform duration-300">
              <img
                src="/teklif.png"
                alt="Teklif"
                className="w-full h-full object-cover scale-[1.28]"
              />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Henuz teklif olusturulmamis</h3>
            <p className="text-slate-600 mb-8 max-w-sm text-center">
              Yeni bir teklif olusturmak icin asagidaki butona tiklayin
            </p>
            <Link
              href="/quotes/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-base text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Ilk Teklifi Olustur
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-indigo-50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="w-[160px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Teklif Numarası</th>
                    <th className="w-[180px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Müşteri Adı</th>
                    <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Tarih</th>
                    <th className="w-[130px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-right">Toplam Tutar</th>
                    <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Durum</th>
                    <th className="w-[170px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-center">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50/50">
                  {paginatedQuotes.map((quote) => {
                    const statusLower = quote.status?.toLowerCase() || "";
                    const isPending = statusLower === "pending" || statusLower === "beklemede";
                    const isApproved = statusLower === "approved" || statusLower === "onaylandi";
                    const isRejected = statusLower === "rejected" || statusLower === "reddedildi";
                    const displayDate = quote.issue_date || quote.quote_date;

                    return (
                      <tr key={quote.id} className="hover:bg-indigo-50/30 transition-colors align-middle">
                        <td className="w-[160px] px-6 py-5 align-middle">
                          <p className="text-sm font-semibold text-on-surface">
                            {quote.quote_number}
                          </p>
                        </td>
                        <td className="w-[180px] px-6 py-5 align-middle">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {contacts[quote.contact_id] || quote.contacts?.name || "—"}
                          </p>
                        </td>
                        <td className="w-[120px] px-6 py-5 align-middle">
                          <p className="text-sm text-slate-700 font-medium">
                            {displayDate ? new Date(displayDate).toLocaleDateString("tr-TR") : "—"}
                          </p>
                        </td>
                        <td className="w-[130px] px-6 py-5 align-middle text-right">
                          <p className="text-sm font-semibold text-on-surface">
                            {fmt(convertQuote(quote.total_amount, quote.currency))}
                          </p>
                        </td>
                        <td className="w-[120px] px-6 py-5 align-middle">
                          <span
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
                              isPending
                                ? "bg-amber-50 text-amber-700"
                                : isApproved
                                  ? "bg-emerald-50 text-emerald-700"
                                  : isRejected
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isPending
                                ? "schedule"
                                : isApproved
                                  ? "check_circle"
                                  : isRejected
                                    ? "cancel"
                                    : "info"}
                            </span>
                            {isPending
                              ? "BEKLEYEN"
                              : isApproved
                                ? "ONAYLANDI"
                                : isRejected
                                  ? "REDDEDİLDİ"
                                  : quote.status}
                          </span>
                        </td>
                        <td className="w-[170px] px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && hasPermission("quotes", "edit") && (
                              <button
                                onClick={() => handleApprove(quote.id)}
                                disabled={actionLoading === quote.id}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 h-8 rounded-lg text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs shadow-sm border border-emerald-200"
                                title="Onayla"
                              >
                                <span
                                  className={`material-symbols-outlined text-base ${actionLoading === quote.id ? "animate-spin" : ""
                                    }`}
                                >
                                  {actionLoading === quote.id ? "progress_activity" : "check_circle"}
                                </span>
                                Onayla
                              </button>
                            )}
                            {isApproved && hasPermission("invoices", "create") && (
                              <button
                                onClick={() => handleConvertToInvoice(quote)}
                                disabled={actionLoading === quote.id + "_convert"}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 h-8 rounded-lg text-amber-700 bg-amber-100 hover:bg-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs shadow-sm border border-amber-200"
                                title="Faturaya Dönüştür"
                              >
                                <span
                                  className={`material-symbols-outlined text-base ${actionLoading === quote.id + "_convert" ? "animate-spin" : ""
                                    }`}
                                >
                                  {actionLoading === quote.id + "_convert" ? "progress_activity" : "receipt_long"}
                                </span>
                                Faturaya Dönüştür
                              </button>
                            )}

                            <div className="w-px h-6 bg-slate-200 mx-1"></div>

                            {/* PDF Download */}
                            <button
                              onClick={() => handleDownloadPdf(quote)}
                              disabled={downloadingPdfId === quote.id}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                              title="PDF Olarak İndir"
                            >
                              <span className={`material-symbols-outlined text-lg ${downloadingPdfId === quote.id ? 'animate-pulse' : ''}`}>
                                {downloadingPdfId === quote.id ? 'sync' : 'picture_as_pdf'}
                              </span>
                            </button>

                            {/* Edit Quote */}
                            {hasPermission("quotes", "edit") && (
                              <Link
                                href={`/quotes/new?id=${quote.id}`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-all"
                                title="Teklifi düzenle"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </Link>
                            )}

                            {/* View Detail */}
                            <Link
                              href={`/quotes/${quote.id}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-all"
                              title="Teklif detaylarını görüntüle"
                            >
                              <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </Link>

                            {/* Soft Delete to Trash */}
                            {hasPermission("quotes", "delete") && (
                              <button
                                onClick={async () => {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  if (!user) { toast.error("Oturum açma gerekli."); return; }
                                  const result = await softDeleteQuote(quote.id, user.id);
                                  if (result.success) {
                                    toast.success("Teklif çöp kutusuna taşındı.", { icon: "🗑️" });
                                    setQuotes(prev => prev.filter(q => q.id !== quote.id));
                                  } else {
                                    toast.error(result.message);
                                  }
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                title="Çöp Kutusuna Taşı"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-6 bg-surface-container-low/30 border-t border-indigo-50 flex items-center justify-between rounded-b-2xl">
              <p className="text-sm text-slate-500 font-medium">
                Toplam{" "}
                <span className="text-indigo-900 font-bold">
                  {filtered.length.toLocaleString("tr-TR")}
                </span>{" "}
                tekliften{" "}
                <span className="text-indigo-900 font-bold">{paginatedQuotes.length}</span>{" "}
                tanesi gösteriliyor
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-colors ${
                      currentPage === i
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
