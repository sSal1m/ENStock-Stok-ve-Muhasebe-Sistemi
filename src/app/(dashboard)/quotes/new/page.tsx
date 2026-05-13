"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Contact {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  tax_rate: number;
}

interface LineItem {
  id: string;
  product_id: string;
  product_name: string;
  search_term: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  title: string;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [contactId, setContactId] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  
  const [productSuggestions, setProductSuggestions] = useState<Record<string, Product[]>>({});
  const [showProductSuggestions, setShowProductSuggestions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    setIssueDate(new Date().toISOString().split("T")[0]);
    
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      setQuoteNumber(`TEK-${year}-${month}-${day}-${randomNum}`);

      const { data: contactsData } = await supabase.from("contacts").select("id, name").order("name");
      if (contactsData) setContacts(contactsData);

      addLineItem();
    };
    init();
  }, [router]);

  const addToast = (type: ToastMessage["type"], title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        product_id: "",
        product_name: "",
        search_term: "",
        quantity: 1,
        unit_price: 0,
        vat_rate: 20,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleProductSearch = async (id: string, term: string) => {
    updateLineItem(id, "search_term", term);
    
    if (term.trim().length < 2) {
      setProductSuggestions((prev) => ({ ...prev, [id]: [] }));
      setShowProductSuggestions((prev) => ({ ...prev, [id]: false }));
      return;
    }

    const { data } = await supabase
      .from("products")
      .select("id, name, sale_price, tax_rate")
      .ilike("name", `%${term}%`)
      .limit(10);

    if (data) {
      setProductSuggestions((prev) => ({ ...prev, [id]: data }));
      setShowProductSuggestions((prev) => ({ ...prev, [id]: true }));
    }
  };

  const selectProduct = (itemId: string, product: Product) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              product_id: product.id,
              product_name: product.name,
              search_term: product.name,
              unit_price: product.sale_price || 0,
              vat_rate: product.tax_rate || 0,
            }
          : item
      )
    );
    setShowProductSuggestions((prev) => ({ ...prev, [itemId]: false }));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    lineItems.forEach((item) => {
      const lineSub = item.quantity * item.unit_price;
      const lineTax = lineSub * (item.vat_rate / 100);
      subtotal += lineSub;
      taxTotal += lineTax;
    });
    return {
      subtotal,
      taxTotal,
      totalAmount: subtotal + taxTotal,
    };
  }, [lineItems]);

  const handleSubmit = async () => {
    if (!contactId) {
      addToast("error", "Hata", "Lütfen bir müşteri seçin.");
      return;
    }
    if (!quoteNumber) {
      addToast("error", "Hata", "Lütfen teklif numarası girin.");
      return;
    }
    const validItems = lineItems.filter((i) => i.product_id);
    if (validItems.length === 0) {
      addToast("error", "Hata", "Lütfen en az bir geçerli ürün seçin.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          contact_id: contactId,
          quote_number: quoteNumber,
          issue_date: issueDate,
          subtotal: totals.subtotal,
          tax_total: totals.taxTotal,
          total_amount: totals.totalAmount,
          notes: notes,
          status: "Pending",
          user_id: userId,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const itemsToInsert = validItems.map((item) => {
        const line_total = item.quantity * item.unit_price * (1 + item.vat_rate / 100);
        return {
          quote_id: quoteData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          line_total: line_total,
        };
      });

      const { error: itemsError } = await supabase.from("quote_items").insert(itemsToInsert);

      if (itemsError) throw itemsError;

      addToast("success", "Başarılı", "Teklif başarıyla oluşturuldu.");
      setTimeout(() => {
        router.push("/quotes");
      }, 1500);

    } catch (error: any) {
      console.error("Save error:", error);
      addToast("error", "Hata", error.message || "Teklif kaydedilirken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-20">
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 max-w-md">
        {toasts.map((toast) => (
          <div key={toast.id} className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-4 transition-all
            ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : ""}
            ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : ""}
          `}>
            <div>
              <p className="font-bold text-sm">{toast.title}</p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Yeni Teklif Oluştur</h1>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Kaydediliyor..." : "Teklifi Kaydet"}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Sol: Müşteri ve Notlar */}
          <section className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Müşteri Seç</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              >
                <option value="">Lütfen müşteri seçin...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notlar</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Teklifle ilgili eklemek istediğiniz notlar..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px] transition-all"
              />
            </div>
          </section>

          {/* Sağ: Teklif Detayları */}
          <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Teklif Numarası</label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none font-medium transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Teklif Tarihi (Issue Date)</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none font-medium transition-all"
              />
            </div>
          </section>
        </div>

        {/* Ürünler Tablosu */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-sm">
                <th className="px-6 py-4 font-semibold text-slate-700 w-1/3">Ürün / Hizmet Arama</th>
                <th className="px-6 py-4 font-semibold text-slate-700 w-32">Miktar</th>
                <th className="px-6 py-4 font-semibold text-slate-700 w-32">Birim Fiyat</th>
                <th className="px-6 py-4 font-semibold text-slate-700 w-24">KDV %</th>
                <th className="px-6 py-4 font-semibold text-slate-700 w-32 text-right">Satır Toplamı</th>
                <th className="px-6 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item) => {
                const lineSubtotal = item.quantity * item.unit_price;
                const lineVat = lineSubtotal * (item.vat_rate / 100);
                const lineTotal = lineSubtotal + lineVat;

                return (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 relative">
                      {!item.product_id ? (
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ürün adı yazın..."
                            value={item.search_term}
                            onChange={(e) => handleProductSearch(item.id, e.target.value)}
                            onFocus={() => {
                              if (item.search_term.length >= 2) {
                                setShowProductSuggestions((prev) => ({ ...prev, [item.id]: true }));
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowProductSuggestions(prev => ({ ...prev, [item.id]: false })), 200)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                          />
                          {showProductSuggestions[item.id] && productSuggestions[item.id]?.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                              {productSuggestions[item.id].map((product) => (
                                <div
                                  key={product.id}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectProduct(item.id, product)}
                                  className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm transition-colors"
                                >
                                  <p className="font-semibold text-slate-800">{product.name}</p>
                                  <p className="text-xs text-slate-500">Fiyat: {product.sale_price} ₺ | KDV: %{product.tax_rate}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{item.product_name}</span>
                          <button
                            onClick={() => updateLineItem(item.id, "product_id", "")}
                            className="text-xs text-purple-600 hover:underline self-start mt-1"
                          >
                            Değiştir
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || ""}
                          onChange={(e) => updateLineItem(item.id, "quantity", Number(e.target.value))}
                          className="w-16 bg-transparent border-b border-transparent focus:border-purple-500 outline-none py-1 text-center font-medium transition-colors"
                        />
                        <span className="text-slate-500 text-sm font-medium">Adet</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price || ""}
                          onChange={(e) => updateLineItem(item.id, "unit_price", Number(e.target.value))}
                          className="w-24 bg-transparent border-b border-transparent focus:border-purple-500 outline-none py-1 text-right font-medium transition-colors"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.vat_rate || ""}
                        onChange={(e) => updateLineItem(item.id, "vat_rate", Number(e.target.value))}
                        className="w-16 bg-transparent border-b border-transparent focus:border-purple-500 outline-none py-1 text-center font-medium transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">
                      {lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Satırı Sil"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button
              onClick={addLineItem}
              className="flex items-center gap-2 text-purple-600 font-semibold text-sm hover:text-purple-700 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Yeni Satır Ekle
            </button>
          </div>
        </section>

        {/* Toplamlar */}
        <div className="flex justify-end">
          <section className="w-full lg:w-1/3 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Ara Toplam:</span>
              <span>{totals.subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Toplam KDV:</span>
              <span>{totals.taxTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
            </div>
            <div className="h-px bg-slate-200 my-2"></div>
            <div className="flex justify-between items-center text-slate-900 text-lg font-bold">
              <span>Genel Toplam:</span>
              <span>{totals.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
