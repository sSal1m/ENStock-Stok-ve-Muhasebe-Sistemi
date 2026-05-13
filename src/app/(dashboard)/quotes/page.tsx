"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Quote {
  id: string;
  quote_number: string;
  issue_date: string;
  total_amount: number;
  status: string;
  contact_id: string;
  contacts?: {
    name: string;
  };
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const router = useRouter();

  const fetchQuotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("quotes")
      .select('*, contacts(name)')
      .order("issue_date", { ascending: false });

    if (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Teklifler yüklenirken bir hata oluştu.");
    } else {
      setQuotes((data || []) as Quote[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleApprove = async (quoteId: string) => {
    const toastId = toast.loading("Onaylanıyor...");
    const { error } = await supabase.from("quotes").update({ status: "Approved" }).eq("id", quoteId);
    if (error) {
      toast.error("Onaylama başarısız oldu.", { id: toastId });
    } else {
      toast.success("Teklif başarıyla onaylandı.", { id: toastId });
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status: "Approved" } : q)));
    }
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    const toastId = toast.loading("Stok kontrol ediliyor ve faturaya dönüştürülüyor...");
    try {
      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError || !quoteItems) throw itemsError || new Error("Kalemler alınamadı");

      for (const item of quoteItems) {
        if (item.product_id) {
          const { data: product, error: prodError } = await supabase
            .from("products")
            .select("name, stock_quantity")
            .eq("id", item.product_id)
            .single();
            
          if (prodError || !product) throw prodError || new Error("Ürün bulunamadı");
          
          if (product.stock_quantity < item.quantity) {
            toast.error(`Yetersiz Stok: ${product.name}`, { id: toastId });
            return;
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı");
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const newInvoiceNumber = `FTR-${year}-${month}-${day}-${randomNum}`;

      const { data: fullQuote, error: fullQuoteError } = await supabase
        .from("quotes")
        .select("subtotal, tax_total, notes")
        .eq("id", quote.id)
        .single();
        
      if (fullQuoteError) throw fullQuoteError;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          contact_id: quote.contact_id,
          invoice_number: newInvoiceNumber,
          type: "sale",
          issue_date: new Date().toISOString().split("T")[0],
          subtotal: fullQuote.subtotal,
          tax_total: fullQuote.tax_total,
          total_amount: quote.total_amount,
          notes: fullQuote.notes,
          status: "pending",
          currency: "TRY"
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItemsToInsert = quoteItems.map((item) => ({
        invoice_id: invoiceData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        line_total: item.line_total
      }));

      const { error: invoiceItemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItemsToInsert);

      if (invoiceItemsError) throw invoiceItemsError;

      toast.success("Fatura Başarıyla Oluşturuldu", { id: toastId });
      router.push("/invoices");

    } catch (error: any) {
      console.error("Conversion error:", error);
      toast.error(`Hata: ${error.message || "Faturaya dönüştürülemedi"}`, { id: toastId });
    }
  };

  const filtered = quotes.filter((quote) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    const customerName = quote.contacts?.name?.toLowerCase() || "";
    
    return (
      quote.quote_number.toLowerCase().includes(searchLower) ||
      customerName.includes(searchLower)
    );
  });

  const paginatedQuotes = filtered.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "approved") {
      return (
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 bg-emerald-50 text-emerald-700">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          ONAYLANDI
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 bg-red-50 text-red-700">
          <span className="material-symbols-outlined text-sm">cancel</span>
          REDDEDİLDİ
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 bg-amber-50 text-amber-700">
        <span className="material-symbols-outlined text-sm">schedule</span>
        BEKLEMEDE
      </span>
    );
  };

  return (
    <div className="w-full p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      {/* Content Area */}
      <div className="w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Teklifler
            </h1>
            <p className="text-slate-600">
              Tüm tekliflerinizi yönetin ve takip edin
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/quotes/new"
              className="flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Yeni Teklif
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="grid grid-cols-1 gap-6">
          <div className="md:col-span-1 relative">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              Ara
            </label>
            <div className="flex items-center bg-white border-2 border-slate-300 rounded-lg px-4 py-3 focus-within:border-purple-400 transition-all max-w-xl">
              <span className="material-symbols-outlined text-slate-400">search</span>
              <input
                className="w-full bg-transparent border-none focus:ring-0 py-2 text-sm placeholder:text-slate-400 outline-none pl-3 font-medium"
                placeholder="Teklif no veya müşteri adı yazın..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
              />
            </div>
          </div>
        </div>

        {/* Quotes Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-slate-600 text-sm">Teklifler yükleniyor...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center mb-8 shadow-sm">
              <span className="material-symbols-outlined text-7xl text-purple-400">description</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Henüz teklif oluşturulmamış</h3>
            <p className="text-slate-600 mb-8 max-w-sm text-center">İlk teklifinizi oluşturmak için aşağıdaki butona tıklayın</p>
            <Link
              href="/quotes/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-base text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              İlk Teklifi Oluştur
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-indigo-50">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="w-[160px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Teklif No</th>
                      <th className="w-[200px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Müşteri Adı</th>
                      <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Tarih</th>
                      <th className="w-[130px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-right">Tutar</th>
                      <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-center">Durum</th>
                      <th className="w-[240px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50/50">
                    {paginatedQuotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-indigo-50/30 transition-colors align-middle">
                        <td className="w-[160px] px-6 py-5 align-middle">
                          <p className="text-sm font-semibold text-slate-900">
                            {quote.quote_number}
                          </p>
                        </td>
                        <td className="w-[200px] px-6 py-5 align-middle">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {quote.contacts?.name || "Bilinmiyor"}
                          </p>
                        </td>
                        <td className="w-[120px] px-6 py-5 align-middle">
                          <p className="text-sm text-slate-700 font-medium">
                            {new Date(quote.issue_date).toLocaleDateString("tr-TR")}
                          </p>
                        </td>
                        <td className="w-[130px] px-6 py-5 align-middle text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {quote.total_amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                          </p>
                        </td>
                        <td className="w-[120px] px-6 py-5 align-middle text-center">
                          {getStatusBadge(quote.status)}
                        </td>
                        <td className="w-[240px] px-6 py-5 text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            {quote.status?.toLowerCase() === "pending" && (
                              <button
                                onClick={() => handleApprove(quote.id)}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                title="Onayla"
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                                Onayla
                              </button>
                            )}

                            {quote.status?.toLowerCase() === "approved" && (
                              <button
                                onClick={() => handleConvertToInvoice(quote)}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-bold transition-colors"
                                title="Faturaya Dönüştür"
                              >
                                <span className="material-symbols-outlined text-sm">receipt_long</span>
                                Faturaya Dönüştür
                              </button>
                            )}

                            <Link
                              href={`/quotes/${quote.id}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-purple-600 hover:bg-purple-50 transition-all"
                              title="Detay Görüntüle"
                            >
                              <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-5 bg-slate-50/50 border-t border-indigo-50 flex justify-between items-center">
                <p className="text-xs text-slate-500 font-medium">
                  {filtered.length === 0
                    ? "Kayıt bulunamadı"
                    : `${paginatedQuotes.length} / ${filtered.length} teklif gösteriliyor (Sayfa ${currentPage + 1})`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 transition-all bg-white flex items-center gap-2 disabled:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 enabled:text-purple-600 enabled:hover:bg-purple-50"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={(currentPage + 1) * ITEMS_PER_PAGE >= filtered.length}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 transition-all bg-white flex items-center gap-2 disabled:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 enabled:text-purple-600 enabled:hover:bg-purple-50"
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
