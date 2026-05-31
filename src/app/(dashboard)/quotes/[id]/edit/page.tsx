"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "react-hot-toast";

interface Contact {
  id: string;
  name: string;
  company_name?: string | null;
}

interface Product {
  id: string;
  name: string;
  sale_price?: number | null;
  tax_rate?: number | null;
}

type QuoteItem = {
  id: string;
  product_id?: string | null;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  vatRate: number;
};

interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  title: string;
}

const ProductSelect = ({
  item,
  updateItem,
  products,
  productSuggestions,
  showProductSuggestions,
  setShowProductSuggestions,
  onSearch,
}: {
  item: QuoteItem;
  updateItem: any;
  products: Product[];
  productSuggestions: Record<string, Product[]>;
  showProductSuggestions: Record<string, boolean>;
  setShowProductSuggestions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSearch: (id: string, term: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(item.name || "");

  useEffect(() => {
    setSearchTerm(item.name || "");
  }, [item.name]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const remoteSuggestions = (productSuggestions[item.id] || []).filter(
    (p) => !filteredProducts.some((fp) => fp.id === p.id)
  );

  return (
    <div className="relative">
      <div className="flex items-center w-full border border-slate-300 rounded px-3 py-2 bg-slate-50 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 transition-all">
        <span className="material-symbols-outlined text-slate-400 mr-2 text-sm">inventory_2</span>
        <input
          className="w-full border-none p-0 focus:ring-0 text-sm bg-transparent placeholder:text-slate-400"
          placeholder="Ürün adı giriniz..."
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);
            updateItem(item.id, "name", value);
            updateItem(item.id, "product_id", undefined);
            setIsOpen(true);
            onSearch(item.id, value);
            if (value.trim().length >= 2) {
              setShowProductSuggestions((prev) => ({ ...prev, [item.id]: true }));
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            if (searchTerm.trim().length >= 2) {
              setShowProductSuggestions((prev) => ({ ...prev, [item.id]: true }));
            }
          }}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
            setTimeout(() => setShowProductSuggestions((prev) => ({ ...prev, [item.id]: false })), 200);
          }}
        />
        <span
          className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors ml-2 text-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </div>

      {(isOpen || showProductSuggestions[item.id]) && (filteredProducts.length > 0 || remoteSuggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl max-h-60 overflow-y-auto">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                updateItem(item.id, "product_id", p.id);
                updateItem(item.id, "name", p.name);
                updateItem(item.id, "price", p.sale_price || 0);
                updateItem(item.id, "vatRate", p.tax_rate || 20);
                setSearchTerm(p.name);
                setIsOpen(false);
                setShowProductSuggestions((prev) => ({ ...prev, [item.id]: false }));
              }}
            >
              <div className="text-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Fiyat: ₺{p.sale_price} | KDV: %{p.tax_rate}
              </div>
            </div>
          ))}
          {remoteSuggestions.map((p) => (
            <div
              key={p.id}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                updateItem(item.id, "product_id", p.id);
                updateItem(item.id, "name", p.name);
                updateItem(item.id, "price", p.sale_price || 0);
                updateItem(item.id, "vatRate", p.tax_rate || 20);
                setSearchTerm(p.name);
                setIsOpen(false);
                setShowProductSuggestions((prev) => ({ ...prev, [item.id]: false }));
              }}
            >
              <div className="text-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Fiyat: ₺{p.sale_price} | KDV: %{p.tax_rate}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const { hasPermission, isLoading: permsLoading } = usePermissions();

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!permsLoading && !hasPermission("quotes", "edit")) {
      toast.error("Bu işlem için yetkiniz bulunmamaktadır.");
      router.replace("/quotes");
    }
  }, [permsLoading, hasPermission, router]);

  if (permsLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-slate-600">Yetkiler kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  const [contactId, setContactId] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [validityDays, setValidityDays] = useState("15 Gun");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [productSuggestions, setProductSuggestions] = useState<Record<string, Product[]>>({});
  const [showProductSuggestions, setShowProductSuggestions] = useState<Record<string, boolean>>({});

  // Load quote data
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        // Load contacts & products
        const { data: contactsData } = await supabase.from("contacts").select("*").order("name");
        if (contactsData) setContacts(contactsData as Contact[]);

        const { data: productsData } = await supabase.from("products").select("*").order("name");
        if (productsData) setProducts(productsData as Product[]);

        // Load quote
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("*")
          .eq("id", quoteId)
          .single();

        if (!quoteData) {
          router.replace("/quotes");
          return;
        }

        setContactId(quoteData.contact_id);
        setQuoteNumber(quoteData.quote_number);
        setIssueDate(quoteData.issue_date || new Date().toISOString().split("T")[0]);
        setNotes(quoteData.notes || "");
        
        const dayNum = quoteData.validity_days;
        const validityStr = dayNum === 7 ? "7 Gun" : dayNum === 15 ? "15 Gun" : dayNum === 30 ? "30 Gun" : "Ozel";
        setValidityDays(validityStr);

        // Load items - FIX: Get product names from products table
        const { data: itemsData } = await supabase
          .from("quote_items")
          .select("*")
          .eq("quote_id", quoteId);

        if (itemsData && itemsData.length > 0 && productsData) {
          setItems(itemsData.map((item: any) => {
            const product = productsData.find((p: Product) => p.id === item.product_id);
            return {
              id: item.id,
              product_id: item.product_id,
              name: product?.name || item.name || "",
              quantity: item.quantity,
              unit: "Adet",
              price: item.unit_price,
              vatRate: item.vat_rate || 20,
            };
          }));
        }
      } catch (error) {
        console.error("Load error:", error);
        addToast("error", "Hata", "Teklif yüklenemedi");
      } finally {
        setInitialLoading(false);
      }
    };

    init();
  }, [quoteId, router]);

  const parseValidityDays = (days: string): number => {
    const match = days.match(/\d+/);
    return match ? parseInt(match[0], 10) : 15;
  };

  const addToast = (type: ToastMessage["type"], title: string, message: string) => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), product_id: undefined, name: "", quantity: 1, unit: "Adet", price: 0, vatRate: 20 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleProductSearch = async (id: string, term: string) => {
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
      setProductSuggestions((prev) => ({ ...prev, [id]: data as Product[] }));
      setShowProductSuggestions((prev) => ({ ...prev, [id]: true }));
    }
  };

  const handleSave = async () => {
    if (!contactId) {
      setErrorMsg("Lütfen bir müşteri seçiniz.");
      addToast("error", "Hata", "Lütfen bir müşteri seçiniz.");
      return;
    }

    if (!quoteNumber.trim()) {
      setErrorMsg("Lütfen teklif numarası giriniz.");
      addToast("error", "Hata", "Lütfen teklif numarası giriniz.");
      return;
    }

    const validItems = items.filter((item) => item.product_id || (item.name || "").trim());
    if (validItems.length === 0) {
      setErrorMsg("Lütfen en az bir geçerli ürün seçin.");
      addToast("error", "Hata", "Lütfen en az bir geçerli ürün seçin.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const subtotal = validItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const tax_total = validItems.reduce(
        (sum, item) => sum + item.quantity * item.price * (item.vatRate / 100),
        0
      );
      const total_amount = subtotal + tax_total;

      // Update quote
      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          contact_id: contactId,
          quote_number: quoteNumber.trim(),
          issue_date: issueDate,
          subtotal,
          tax_total,
          total_amount,
          notes,
          validity_days: parseValidityDays(validityDays),
        })
        .eq("id", quoteId);

      if (updateError) throw updateError;

      // Delete old items
      await supabase.from("quote_items").delete().eq("quote_id", quoteId);

      // Insert new items
      const itemsToInsert = validItems.map((item) => ({
        quote_id: quoteId,
        product_id: item.product_id || null,
        quantity: item.quantity,
        unit_price: item.price,
        vat_rate: item.vatRate,
        line_total: item.quantity * item.price * (1 + item.vatRate / 100),
      }));

      const { error: itemsError } = await supabase.from("quote_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;

      setSuccessMsg("Teklif başarıyla güncellendi! Yönlendiriliyorsunuz...");
      addToast("success", "Başarılı", "Teklif güncellendi");
      setTimeout(() => {
        router.push("/quotes");
      }, 1200);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Teklif kaydedilirken hata oluştu.");
      addToast("error", "Hata", err.message || "Teklif kaydedilirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg border pointer-events-auto transition-all ${
              toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : ""
            } ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : ""}`}
          >
            <p className="font-semibold text-sm">{toast.title}</p>
            <p className="text-sm opacity-90">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Teklifi Düzenle</h1>
            <p className="text-slate-500 mt-1 text-sm">Mevcut teklif bilgilerini güncelleyin</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">
              {isLoading ? "progress_activity" : "save"}
            </span>
            {isLoading ? "Kaydediliyor..." : "Güncelle"}
          </button>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg border border-emerald-200 flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 space-y-8">
          
          {/* Contact & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Müşteri *</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Müşteri Seçiniz...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.company_name || "Bilinmeyen"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Teklif Tarihi *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Teklif Numarası *</label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Geçerlilik Süresi *</label>
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="7 Gun">7 Gün</option>
                <option value="15 Gun">15 Gün</option>
                <option value="30 Gun">30 Gün</option>
                <option value="Ozel">Özel</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Items Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Teklif Kalemleri</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Satır Ekle
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Ürün/Hizmet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Miktar</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Fiyat</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">KDV %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Toplam</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const total = item.quantity * item.price * (1 + item.vatRate / 100);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <ProductSelect
                            item={item}
                            updateItem={updateItem}
                            products={products}
                            productSuggestions={productSuggestions}
                            showProductSuggestions={showProductSuggestions}
                            setShowProductSuggestions={setShowProductSuggestions}
                            onSearch={handleProductSearch}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value ? Number(e.target.value) : 0)}
                            className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price === 0 && !item.name ? "" : item.price}
                            onChange={(e) => updateItem(item.id, "price", e.target.value ? Number(e.target.value) : 0)}
                            className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.vatRate}
                            onChange={(e) => updateItem(item.id, "vatRate", Number(e.target.value))}
                            className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 text-sm">
                          ₺{total.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="text-slate-400 hover:text-red-500 disabled:text-slate-200 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Notlar</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ödeme koşulları, teslimat bilgileri vb..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-24 resize-none"
              />
            </div>

            <div className="space-y-3 bg-indigo-50 p-4 rounded-lg">
              {(() => {
                const sub = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
                const tax = items.reduce((sum, item) => sum + item.quantity * item.price * (item.vatRate / 100), 0);
                const total = sub + tax;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Ara Toplam:</span>
                      <span className="font-semibold text-slate-900">₺{sub.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">KDV:</span>
                      <span className="font-semibold text-slate-900">₺{tax.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-indigo-200 pt-3 flex justify-between">
                      <span className="font-semibold text-slate-900">Toplam:</span>
                      <span className="text-xl font-bold text-indigo-600">₺{total.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
