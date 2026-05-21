"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import CurrencySwitcher from "@/components/common/CurrencySwitcher";

interface QuoteItem {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  products?: {
    name: string;
  };
}

interface QuoteDetails {
  id: string;
  quote_number: string;
  issue_date: string;
  status: string;
  subtotal: number;
  tax_total: number;
  total_amount: number;
  notes: string | null;
  contact_id: string;
  contacts: {
    name: string;
    tax_number: string | null;
    tax_office: string | null;
    address: string | null;
  };
}

export default function QuoteDetailsPage() {
  const params = useParams();
  const quoteId = params.id as string;
  const router = useRouter();
  const { viewCurrency, setViewCurrency, convert, format: fmtCurrency } = useCurrencyConverter();

  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchQuoteDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: quoteData, error: quoteError } = await supabase
          .from("quotes")
          .select(`*, contacts (name, tax_number, tax_office, address)`)
          .eq("id", quoteId)
          .single();

        if (quoteError || !quoteData) {
          console.error("Teklif bulunamadı:", quoteError);
          setLoading(false);
          return;
        }

        setQuote(quoteData as any);

        const { data: itemsData, error: itemsError } = await supabase
          .from("quote_items")
          .select("*, products(name)")
          .eq("quote_id", quoteId);

        if (!itemsError && itemsData) {
          setItems(itemsData);
        }
      } catch (err) {
        console.error("Beklenmeyen hata:", err);
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      fetchQuoteDetails();
    }
  }, [quoteId, router]);

  const handleApprove = async () => {
    setActionLoading(true);
    const toastId = toast.loading("Onaylanıyor...");
    const { error } = await supabase.from("quotes").update({ status: "Approved" }).eq("id", quoteId);
    if (error) {
      toast.error("Onaylama başarısız oldu.", { id: toastId });
    } else {
      toast.success("Teklif başarıyla onaylandı.", { id: toastId });
      setQuote(prev => prev ? { ...prev, status: "Approved" } : null);
    }
    setActionLoading(false);
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;
    setActionLoading(true);
    const toastId = toast.loading("Faturaya dönüştürülüyor...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı");
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const newInvoiceNumber = `FTR-${year}-${month}-${day}-${randomNum}`;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          contact_id: quote.contact_id,
          invoice_number: newInvoiceNumber,
          type: "sale",
          issue_date: new Date().toISOString().split("T")[0],
          subtotal: quote.subtotal,
          tax_total: quote.tax_total,
          total_amount: quote.total_amount,
          notes: quote.notes,
          status: "pending",
          currency: "TRY"
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItemsToInsert = items.map((item) => ({
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
      router.push(`/invoices/${invoiceData.id}`);

    } catch (error: any) {
      console.error("Conversion error:", error);
      toast.error(`Hata: ${error.message || "Faturaya dönüştürülemedi"}`, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    setDownloading(true);
    const toastId = toast.loading("PDF hazırlanıyor...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı");

      // Company info
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

      const pdfData = {
        companyName,
        companyAddress,
        companyTaxId,
        invoiceNumber: quote.quote_number,
        issueDate: quote.issue_date,
        currency: 'TRY',
        status: quote.status,
        notes: quote.notes || undefined,
        contactName: quote.contacts?.name || "Bilinmeyen Cari",
        contactTaxNumber: quote.contacts?.tax_number || undefined,
        contactTaxOffice: quote.contacts?.tax_office || undefined,
        items: items.map((item) => {
          const lineSubtotal = item.quantity * item.unit_price;
          const lineVat = lineSubtotal * (item.vat_rate / 100);
          return {
            productName: item.products?.name || "Bilinmeyen Ürün",
            quantity: item.quantity,
            unitPrice: item.unit_price,
            vatRate: item.vat_rate,
            lineTotal: lineSubtotal + lineVat,
          };
        }),
        subtotal: quote.subtotal,
        vatTotal: quote.tax_total,
        grandTotal: quote.total_amount,
      };

      const { generateInvoicePdf } = await import("@/lib/generateInvoicePdf");
      await generateInvoicePdf(pdfData, "quotation");
      toast.success("PDF başarıyla indirildi.", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`PDF oluşturulamadı: ${e.message}`, { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">description</span>
        <h2 className="text-2xl font-bold text-slate-700">Teklif Bulunamadı</h2>
        <p className="text-slate-500 mt-2 mb-6 text-center max-w-sm">
          Aradığınız teklif sistemde bulunamadı veya silinmiş olabilir. Görmeye yetkiniz olduğundan emin olun.
        </p>
        <Link href="/quotes" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-purple-700 transition">
          Tekliflere Dön
        </Link>
      </div>
    );
  }

  // Teklif tutarları TRY bazlı; viewCurrency'ye çevirip formatlar.
  const formatCurrency = (val: number) => fmtCurrency(convert(val), viewCurrency);

  return (
    <div className="w-full p-8 max-w-[1200px] mx-auto min-h-screen bg-slate-50">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Link href="/quotes" className="flex items-center gap-1 text-slate-500 hover:text-purple-600 text-sm font-semibold mb-2 transition">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Tekliflere Dön
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900">
              {quote.quote_number}
            </h1>
            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg ${
              quote.status.toLowerCase() === 'pending' ? "bg-amber-100 text-amber-700" :
              quote.status.toLowerCase() === 'approved' ? "bg-emerald-100 text-emerald-700" :
              "bg-red-100 text-red-700"
            }`}>
               {quote.status.toLowerCase() === 'pending' ? "BEKLEMEDE" :
                quote.status.toLowerCase() === 'approved' ? "ONAYLANDI" :
                "REDDEDİLDİ"}
            </span>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {quote.status.toLowerCase() === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">check</span>
              Teklifi Onayla
            </button>
          )}

          {quote.status.toLowerCase() === 'approved' && (
            <button
              onClick={handleConvertToInvoice}
              disabled={actionLoading}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:bg-purple-700 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              Bu Teklifi Faturaya Dönüştür
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-emerald-200 text-emerald-700 px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">{downloading ? 'sync' : 'download'}</span>
            PDF İndir
          </button>

          <CurrencySwitcher value={viewCurrency} onChange={setViewCurrency} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MAIN QUOTE DETAILS */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex justify-between items-start mb-10">
               <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cari Hesap</h3>
                  <Link href={`/contacts/${quote.contact_id}`} className="text-xl font-black text-purple-700 hover:underline">
                    {quote.contacts?.name}
                  </Link>
                  <p className="text-sm text-slate-500 mt-2">VKN/TC: {quote.contacts?.tax_number || 'Belirtilmemiş'}</p>
                  <p className="text-sm text-slate-500">VD: {quote.contacts?.tax_office || 'Belirtilmemiş'}</p>
               </div>
               <div className="text-right">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Teklif Tarihi</h3>
                  <p className="text-lg font-bold text-slate-900">{new Date(quote.issue_date).toLocaleDateString('tr-TR')}</p>
               </div>
             </div>

             <div className="overflow-x-auto rounded-xl border border-slate-200">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Hizmet / Ürün</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-center">Miktar</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">B.Fiyat</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">KDV</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item) => {
                      const lineSubtotal = item.quantity * item.unit_price;
                      const lineVat = lineSubtotal * (item.vat_rate / 100);
                      return (
                      <tr key={item.id}>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">{item.products?.name || "Bilinmeyen Ürün"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 text-right">% {item.vat_rate}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(lineSubtotal + lineVat)}</td>
                      </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Kayıtlı kalem bulunmuyor.</td></tr>
                    )}
                  </tbody>
               </table>
             </div>
          </div>

          {quote.notes && (
             <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-6">
               <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                 <span className="material-symbols-outlined text-sm">edit_note</span>
                 Teklif Notu
               </h3>
               <p className="text-amber-900 text-sm whitespace-pre-wrap">{quote.notes}</p>
             </div>
          )}
        </div>

        {/* SIDE TOTALS */}
        <div className="md:col-span-1">
          <div className="bg-slate-800 rounded-2xl shadow-lg p-6 text-white sticky top-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-700 pb-4">Özet Toplamlar</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-slate-300 text-sm">
                <span>Ara Toplam</span>
                <span className="font-medium text-white">{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-sm">
                <span>KDV Toplamı</span>
                <span className="font-medium text-white">{formatCurrency(quote.tax_total)}</span>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-slate-700 pt-6">
               <span className="text-sm font-bold text-slate-300 uppercase">Genel Toplam</span>
               <span className="text-3xl font-black text-emerald-400">{formatCurrency(quote.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
