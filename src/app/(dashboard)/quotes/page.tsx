"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";

interface Quote {
  id: string;
  quote_number: string;
  quote_date?: string;
  issue_date?: string;
  total_amount: number;
  tax_total: number;
  status: string;
  contact_id: string;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(val);

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  const fetchQuotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch quotes
    // We order by quote_date or issue_date depending on schema, default to quote_date
    const { data: quotesData, error: quotesError } = await supabase
      .from("quotes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (quotesError) {
      console.error("Error fetching quotes:", quotesError);
      setLoading(false);
      return;
    }

    setQuotes((quotesData || []) as Quote[]);

    // Fetch contacts for mapping
    if (quotesData && quotesData.length > 0) {
      const contactIds = [...new Set(quotesData.map((q: any) => q.contact_id))];
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
    fetchQuotes();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("quotes")
      .update({ status: "Approved" })
      .eq("id", id);
    
    if (error) {
      console.error("Error approving quote:", error);
      toast.error("Teklif onaylanırken hata oluştu.");
    } else {
      setQuotes((prev) => prev.map(q => q.id === id ? { ...q, status: "Approved" } : q));
      toast.success("Teklif başarıyla onaylandı.");
    }
    setActionLoading(null);
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    try {
      setActionLoading(quote.id + "_convert");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı");

      // 1. Fetch full quote data
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quote.id)
        .single();
        
      if (quoteError) throw quoteError;

      // 2. Fetch quote items
      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      // 2.5 Check stock (Option 2)
      if (quoteItems && quoteItems.length > 0) {
        const productIds = quoteItems.map((item: any) => item.product_id).filter(Boolean);
        if (productIds.length > 0) {
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("id, name, stock_quantity")
            .in("id", productIds);

          if (productsError) throw productsError;

          let insufficientProducts: string[] = [];

          quoteItems.forEach((item: any) => {
            if (item.product_id) {
              const product = productsData?.find((p: any) => p.id === item.product_id);
              if (product && product.stock_quantity < item.quantity) {
                insufficientProducts.push(`${product.name}`);
              }
            }
          });

          if (insufficientProducts.length > 0) {
            toast.error(`Yetersiz stok nedeniyle fatura oluşturulamadı. Eksik ürünler: ${insufficientProducts.join(", ")}`, { duration: 5000 });
            setActionLoading(null);
            return;
          }
        }
      }

      // 3. Create invoice number
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const invoice_number = `FTR-${timestamp}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      // 4. Insert into invoices table
      const { data: newInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          created_by: user.id,
          contact_id: quoteData.contact_id,
          type: "sale",
          invoice_number,
          issue_date: new Date().toISOString().split('T')[0],
          subtotal: quoteData.subtotal || 0,
          tax_total: quoteData.tax_total || 0,
          total_amount: quoteData.total_amount || 0,
          notes: quoteData.notes || "",
          status: "pending"
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 5. Insert invoice items
      if (quoteItems && quoteItems.length > 0) {
        const invoiceItemsToInsert = quoteItems.map((item: any) => ({
          invoice_id: newInvoice.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          line_total: item.line_total
        }));

        const { error: insertItemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItemsToInsert);

        if (insertItemsError) throw insertItemsError;
      }

      toast.success("Fatura başarıyla oluşturuldu!");
      router.push(`/invoices`);

    } catch (error: any) {
      console.error("Error converting to invoice:", error);
      toast.error("Faturaya dönüştürülürken bir hata oluştu: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = quotes.filter((quote) => {
    const statusLower = quote.status?.toLowerCase() || "";
    let isMatch = true;
    if (filterType === "pending") isMatch = statusLower === "pending" || statusLower === "beklemede";
    if (filterType === "approved") isMatch = statusLower === "approved" || statusLower === "onaylandı";
    if (filterType === "rejected") isMatch = statusLower === "rejected" || statusLower === "reddedildi";

    const searchMatch =
      (quote.quote_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (contacts[quote.contact_id]?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
    return (filterType === "all" || isMatch) && searchMatch;
  });

  const totalAmount = filtered.reduce((sum, q) => sum + (q.total_amount || 0), 0);
  const vatAmount = filtered.reduce((sum, q) => sum + (q.tax_total || 0), 0);

  return (
    <div className="w-full p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      <Toaster position="top-right" />
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
          <Link
            href="/quotes/new"
            className="flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            + Yeni Teklif
          </Link>
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
            onClick={() => setFilterType("pending")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              filterType === "pending"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
            }`}
          >
            <span className="material-symbols-outlined align-middle mr-2 text-lg">schedule</span>
            Beklemede
          </button>
          <button
            onClick={() => setFilterType("approved")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              filterType === "approved"
                ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
            }`}
          >
            <span className="material-symbols-outlined align-middle mr-2 text-lg">check_circle</span>
            Onaylandı
          </button>
          <button
            onClick={() => setFilterType("rejected")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              filterType === "rejected"
                ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
            }`}
          >
            <span className="material-symbols-outlined align-middle mr-2 text-lg">cancel</span>
            Reddedildi
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
                placeholder="Teklif no veya müşteri adı yazın..."
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
                <p className="font-bold text-2xl text-orange-700">{fmt(vatAmount)}</p>
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
                <p className="font-bold text-2xl text-green-700">{fmt(totalAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-green-200/50 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-green-600">payments</span>
              </div>
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
              <span className="material-symbols-outlined text-7xl text-purple-400">request_quote</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Henüz teklif oluşturulmamış</h3>
            <p className="text-slate-600 mb-8 max-w-sm text-center">Yeni bir teklif oluşturmak için aşağıdaki butona tıklayın</p>
            <Link
              href="/quotes/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-base text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              İlk Teklifi Oluştur
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Teklif Numarası
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Müşteri Adı
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600 text-right">
                    Toplam Tutar
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Durum
                  </th>
                  <th className="px-6 py-4 w-auto"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((quote) => {
                  const statusLower = quote.status?.toLowerCase() || "";
                  const isPending = statusLower === "pending" || statusLower === "beklemede";
                  const isApproved = statusLower === "approved" || statusLower === "onaylandı";
                  const isRejected = statusLower === "rejected" || statusLower === "reddedildi";
                  
                  const displayDate = quote.issue_date || quote.quote_date;

                  return (
                  <tr key={quote.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {quote.quote_number}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{contacts[quote.contact_id] || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">
                        {displayDate ? new Date(displayDate).toLocaleDateString("tr-TR") : "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-semibold text-slate-900">{fmt(quote.total_amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 w-fit ${
                          isPending ? "bg-orange-100 text-orange-700" :
                          isApproved ? "bg-green-100 text-green-700" :
                          isRejected ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {isPending ? "schedule" : isApproved ? "check_circle" : isRejected ? "cancel" : "info"}
                        </span>
                        {isPending ? "Beklemede" : isApproved ? "Onaylandı" : isRejected ? "Reddedildi" : quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isPending && (
                          <button
                            onClick={() => handleApprove(quote.id)}
                            disabled={actionLoading === quote.id}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 h-8 rounded-lg text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs shadow-sm border border-emerald-200"
                            title="Onayla"
                          >
                            <span className={`material-symbols-outlined text-base ${actionLoading === quote.id ? "animate-spin" : ""}`}>
                              {actionLoading === quote.id ? "progress_activity" : "check_circle"}
                            </span>
                            Onayla
                          </button>
                        )}
                        {isApproved && (
                          <button
                            onClick={() => handleConvertToInvoice(quote)}
                            disabled={actionLoading === quote.id + "_convert"}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 h-8 rounded-lg text-amber-700 bg-amber-100 hover:bg-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs shadow-sm border border-amber-200"
                            title="Faturaya Dönüştür"
                          >
                            <span className={`material-symbols-outlined text-base ${actionLoading === quote.id + "_convert" ? "animate-spin" : ""}`}>
                              {actionLoading === quote.id + "_convert" ? "progress_activity" : "receipt_long"}
                            </span>
                            Faturaya Dönüştür
                          </button>
                        )}
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-all"
                          title="Teklif detaylarını görüntüle"
                        >
                          <span className="material-symbols-outlined text-lg">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
