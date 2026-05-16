"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { softDeleteInvoice } from "@/app/(dashboard)/trash/actions";
import Link from "next/link";
import toast from "react-hot-toast";
import { resolveTeamIds, applyTeamFilter } from "@/lib/teamUtils";

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

export default function ProposalsPage() {
  const { viewCurrency, setViewCurrency, convert, format } = useCurrencyConverter();
  const [proposals, setProposals] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "sales" | "purchase">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  const fetchProposals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const teamIds = await resolveTeamIds(user.id);

    // Fetch proposals (type = 'proposal')
    const { data: proposalsData, error: proposalsError } = await applyTeamFilter(
      supabase.from("invoices").select("*").eq("type", "proposal").is("deleted_at", null),
      teamIds
    ).order("issue_date", { ascending: false });

    if (proposalsError) {
      console.error("Error fetching proposals:", proposalsError);
      setLoading(false);
      return;
    }

    setProposals((proposalsData || []) as Invoice[]);

    if (proposalsData && proposalsData.length > 0) {
      const contactIds = [...new Set(proposalsData.map((i: any) => i.contact_id))];
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
    fetchProposals();
  }, []);

  const filtered = proposals.filter((proposal) => {
    const typeMatch = filterType === "all" || proposal.type === (filterType === "sales" ? "sale" : filterType === "purchase" ? "purchase" : proposal.type);
    
    if (!searchTerm.trim()) {
      return typeMatch;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const searchMatch =
      proposal.invoice_number.toLowerCase().includes(searchLower) ||
      (contacts[proposal.contact_id]?.toLowerCase().includes(searchLower) ?? false);
    return typeMatch && searchMatch;
  });

  const calculateInView = (amountTry: number) => {
    return convert(amountTry);
  };

  const totalAmount = filtered.reduce((sum, prop) => sum + calculateInView(prop.total_amount), 0);
  const vatAmount = filtered.reduce((sum, prop) => sum + calculateInView(prop.tax_total), 0);

  const handleDownloadPdf = async (proposal: Invoice) => {
    setDownloadingPdfId(proposal.id);
    const toastId = toast.loading("PDF hazırlanıyor...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı");

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

      const { data: contactData } = await supabase.from("contacts").select("*").eq("id", proposal.contact_id).single();
      const { data: itemsData } = await supabase.from("invoice_items").select("*").eq("invoice_id", proposal.id);
      
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

      const pdfData = {
        companyName,
        companyAddress,
        companyTaxId,
        invoiceNumber: proposal.invoice_number,
        issueDate: proposal.issue_date,
        currency: proposal.currency || "TRY",
        status: proposal.status,
        contactName: contactData?.name || "Cari Belirtilmemiş",
        contactTaxNumber: contactData?.tax_number,
        contactTaxOffice: contactData?.tax_office,
        items: formattedItems,
        subtotal: proposal.total_amount - proposal.tax_total,
        vatTotal: proposal.tax_total,
        grandTotal: proposal.total_amount,
      };

      const { data: fullProposal } = await supabase.from("invoices").select("notes").eq("id", proposal.id).single();
      if (fullProposal && fullProposal.notes) (pdfData as any).notes = fullProposal.notes;

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

  const paginatedProposals = filtered.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="w-full p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
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
              href="/proposals/new"
              className="flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Yeni Teklif
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
                placeholder="Teklif no veya cari adı yazın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

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

        {/* Proposals Table */}
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
            <p className="text-slate-600 mb-8 max-w-sm text-center">Yeni bir teklif oluşturmak için aşağıdaki butona tıklayın</p>
            <Link
              href="/proposals/new"
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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Teklif No</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Cari Adı</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Tür</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Tarih</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-right">Tutar</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle">Durum</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest align-middle text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50/50">
                    {paginatedProposals.map((proposal) => (
                      <tr key={proposal.id} className="hover:bg-indigo-50/30 transition-colors align-middle">
                        <td className="px-6 py-5 align-middle">
                          <p className="text-sm font-semibold text-on-surface">
                            {proposal.invoice_number}
                          </p>
                        </td>
                        <td className="px-6 py-5 align-middle">
                          <p className="text-sm font-medium text-slate-700 truncate">{contacts[proposal.contact_id] || "—"}</p>
                        </td>
                        <td className="px-6 py-5 align-middle">
                          <span
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
                              proposal.type === "sale"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-indigo-50 text-indigo-700"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {proposal.type === "sale" ? "trending_up" : "trending_down"}
                            </span>
                            {proposal.type === "sale" ? "Satış" : "Alış"}
                          </span>
                        </td>
                        <td className="px-6 py-5 align-middle">
                          <p className="text-sm text-slate-700 font-medium">
                            {new Date(proposal.issue_date).toLocaleDateString("tr-TR")}
                          </p>
                        </td>
                        <td className="px-6 py-5 align-middle text-right">
                          <p className="text-sm font-semibold text-on-surface">{format(calculateInView(proposal.total_amount))}</p>
                        </td>
                        <td className="px-6 py-5 align-middle">
                          <span
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
                            proposal.status === "draft" ? "bg-slate-100 text-slate-700" : proposal.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            <span className="material-symbols-outlined text-sm">
                              {proposal.status === "draft" ? "description" : proposal.status === "pending" ? "schedule" : "check_circle"}
                            </span>
                            {proposal.status === "draft" ? "TASLAK" : proposal.status === "pending" ? "BEKLIYOR" : "KABUL"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDownloadPdf(proposal)}
                              disabled={downloadingPdfId === proposal.id}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                              title="PDF Olarak İndir"
                            >
                              <span className={`material-symbols-outlined ${downloadingPdfId === proposal.id ? 'animate-pulse' : ''}`}>
                                {downloadingPdfId === proposal.id ? 'sync' : 'picture_as_pdf'}
                              </span>
                            </button>
                            <Link
                              href={`/proposals/new?id=${proposal.id}`}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-primary hover:bg-primary/10 transition-all"
                              title="Teklifi düzenle"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </Link>
                            <button
                              onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) { toast.error("Oturum açma gerekli."); return; }
                                const result = await softDeleteInvoice(proposal.id, user.id);
                                if (result.success) {
                                  toast.success(`Teklif çöp kutusuna taşındı.`, { icon: "🗑️" });
                                  setProposals(prev => prev.filter(x => x.id !== proposal.id));
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
                    : `${paginatedProposals.length} / ${filtered.length} teklif gösteriliyor (Sayfa ${currentPage + 1})`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all"
                  >
                    ← Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => (prev + 1) * ITEMS_PER_PAGE < filtered.length ? prev + 1 : prev)}
                    disabled={(currentPage + 1) * ITEMS_PER_PAGE >= filtered.length}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all"
                  >
                    Sonraki →
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
