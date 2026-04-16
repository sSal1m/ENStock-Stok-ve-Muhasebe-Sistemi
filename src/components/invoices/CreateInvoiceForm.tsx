"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createInvoiceAction, searchContacts, searchProducts, getNextInvoiceNumber, type InvoiceLineItem } from "@/app/(dashboard)/invoices/actions";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/invoices/Toast";

interface Contact {
  id: string;
  name: string;
  tax_number: string | null;
  tax_office: string | null;
  type: "customer" | "supplier";
}

interface Product {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  sale_price: number;
  purchase_price: number;
}

interface LineItem extends InvoiceLineItem {
  id: string;
  product_name?: string;
  stock_quantity?: number;
  line_total?: number;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  title: string;
}

export default function CreateInvoiceForm({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editInvoiceId = searchParams.get("id");  // ✅ Draft fatura ID'si
  const [isEditMode, setIsEditMode] = useState(!!editInvoiceId);
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [invoiceType, setInvoiceType] = useState<"sales" | "purchase">("sales");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const contactSearchRef = useRef<HTMLDivElement>(null);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [productSuggestions, setProductSuggestions] = useState<Record<string, Product[]>>({});
  const [showProductSuggestions, setShowProductSuggestions] = useState<Record<string, boolean>>({});
  const productSearchRef = useRef<Record<string, HTMLDivElement | null>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(!!editInvoiceId); // ✅ Taslak yükleme durumu

  // Initialize invoice number
  useEffect(() => {
    const initInvoiceNumber = async () => {
      if (!editInvoiceId) {
        const nextNum = await getNextInvoiceNumber(userId, invoiceType);
        setInvoiceNumber(`FTR-${new Date().getFullYear()}-${nextNum.toString().padStart(3, "0")}`);
      }
    };
    initInvoiceNumber();
  }, [userId, invoiceType, editInvoiceId]);

  // ✅ Load draft invoice data if editing
  useEffect(() => {
    if (!editInvoiceId) {
      setIsInitialLoading(false);
      return;
    }

    const loadDraftInvoice = async () => {
      try {
        // Fetch invoice
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", editInvoiceId)
          .single();

        if (invoiceError || !invoiceData) {
          console.error("Fatura yüklenemedi:", invoiceError);
          addToast("error", "❌ Hata", "Taslak fatura yüklenemedi");
          setIsInitialLoading(false);
          return;
        }

        // Set invoice metadata
        setInvoiceType(invoiceData.type === "sale" ? "sales" : "purchase");
        setIssueDate(invoiceData.issue_date);
        setNotes(invoiceData.notes || "");
        setInvoiceNumber(invoiceData.invoice_number);

        // Fetch and set contact
        const { data: contactData, error: contactError } = await supabase
          .from("contacts")
          .select("id, name, tax_number, tax_office, type")
          .eq("id", invoiceData.contact_id)
          .single();

        if (contactData) {
          setSelectedContact(contactData as Contact);
        }

        // Fetch invoice items
        const { data: itemsData, error: itemsError } = await supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", editInvoiceId);

        if (itemsData && itemsData.length > 0) {
          const formattedItems = await Promise.all(
            itemsData.map(async (item: any) => {
              const { data: productData } = await supabase
                .from("products")
                .select("id, name, stock_quantity")
                .eq("id", item.product_id)
                .single();

              return {
                id: Math.random().toString(36).substr(2, 9),
                product_id: item.product_id,
                product_name: productData?.name || "—",
                stock_quantity: productData?.stock_quantity || 0,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                vat_rate: Number(item.vat_rate),
                line_total: Number(item.line_total),
              };
            })
          );
          setLineItems(formattedItems);
        }

        console.log("✅ Taslak fatura başarıyla yüklendi");
      } catch (error) {
        console.error("Taslak yükleme hatası:", error);
        addToast("error", "❌ Hata", "Veriler yüklenirken hata oluştu");
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadDraftInvoice();
  }, [editInvoiceId]);

  // Add toast notification
  const addToast = (type: Toast["type"], title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Search contacts
  const handleContactSearch = useCallback(async (value: string) => {
    setContactSearch(value);
    if (value.length < 1) {
      setContactSuggestions([]);
      setShowContactSuggestions(false);
      return;
    }
    const result = await searchContacts(userId, value);
    if (result.success) {
      setContactSuggestions(result.data);
      setShowContactSuggestions(true);
    }
  }, [userId]);

  // Select contact
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactSearch("");
    setShowContactSuggestions(false);
  };

  // Search products
  const handleProductSearch = useCallback(
    async (lineItemId: string, value: string) => {
      setProductSearch((prev) => ({ ...prev, [lineItemId]: value }));
      if (value.length < 1) {
        setProductSuggestions((prev) => ({ ...prev, [lineItemId]: [] }));
        setShowProductSuggestions((prev) => ({ ...prev, [lineItemId]: false }));
        return;
      }
      const result = await searchProducts(userId, value, invoiceType);
      if (result.success) {
        setProductSuggestions((prev) => ({ ...prev, [lineItemId]: result.data }));
        setShowProductSuggestions((prev) => ({ ...prev, [lineItemId]: true }));
      }
    },
    [userId, invoiceType]
  );

  // Select product
  const handleSelectProduct = (lineItemId: string, product: Product) => {
    const unitPrice = invoiceType === "sales" ? product.sale_price : product.purchase_price;
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === lineItemId
          ? {
              ...item,
              product_id: product.id,
              product_name: product.name,
              unit_price: unitPrice,
              stock_quantity: product.stock_quantity,
            }
          : item
      )
    );
    // Clear search input but keep product_name in state
    setProductSearch((prev) => ({ ...prev, [lineItemId]: product.name }));
    setShowProductSuggestions((prev) => ({ ...prev, [lineItemId]: false }));
  };

  // Add new line item
  const addLineItem = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setLineItems((prev) => [
      ...prev,
      {
        id: newId,
        product_id: "",
        quantity: 1,
        unit_price: 0,
        vat_rate: 20,
        stock_quantity: 0,
      },
    ]);
  };

  // Update line item
  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  // Delete line item
  const deleteLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let vatTotal = 0;

    lineItems.forEach((item) => {
      if (item.product_id) {
        const lineSubtotal = item.quantity * item.unit_price;
        const lineVat = lineSubtotal * (item.vat_rate / 100);
        subtotal += lineSubtotal;
        vatTotal += lineVat;
      }
    });

    return {
      subtotal,
      vatTotal,
      total: subtotal + vatTotal,
    };
  };

  // ✅ Validation helper
  const validateForm = (): boolean => {
    if (!selectedContact) {
      addToast("error", "❌ Cari Seçilmedi", "Lütfen bir müşteri veya cari hesap seçiniz");
      return false;
    }

    if (lineItems.length === 0) {
      addToast("error", "❌ Ürün Yok", "Lütfen en az bir ürün/hizmet ekleyiniz");
      return false;
    }

    const incompleteItems = lineItems.filter((item) => !item.product_id);
    if (incompleteItems.length > 0) {
      addToast("error", "❌ Eksik Ürün Bilgisi", `${incompleteItems.length} satırda ürün seçilmemiş`);
      return false;
    }

    return true;
  };

  // ✅ Save as Draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await createInvoiceAction({
        user_id: userId,
        contact_id: selectedContact!.id,
        invoice_type: invoiceType,
        issue_date: issueDate,
        notes: notes || undefined,
        line_items: lineItems.map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
        })),
        status: "draft",  // ✅ Draft olarak kaydet
        invoice_id: editInvoiceId || undefined,  // ✅ Update varsa ID
        invoice_number: invoiceNumber, // ✅ Manuel atanan fatura numarası
      });

      if (response.success) {
        addToast("success", "📝 Taslak Kaydedildi", response.message);
        
        setTimeout(() => {
          router.push("/invoices");
        }, 2000);
      } else {
        const errorDetails = response.errors ? Object.values(response.errors).join(" | ") : "";
        const fullMessage = errorDetails ? `${response.message} (${errorDetails})` : response.message;
        addToast("error", "❌ Hata Oluştu", fullMessage);
      }
    } catch (error) {
      console.error("Save draft error:", error);
      addToast("error", "❌ Bağlantı Hatası", "Sunucu ile iletişim kurulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Issue & Process (Stock - Balance)
  const handleIssueAndProcess = async () => {
    if (!validateForm()) return;

    // ✅ Stock check for sales
    if (invoiceType === "sales") {
      const invalidItems = lineItems.filter((item) => (item.stock_quantity || 0) < item.quantity);
      if (invalidItems.length > 0) {
        const itemList = invalidItems.map(i => i.product_name).join(", ");
        addToast("error", "❌ Yetersiz Stok", `${itemList} - stok yeterli değil`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await createInvoiceAction({
        user_id: userId,
        contact_id: selectedContact!.id,
        invoice_type: invoiceType,
        issue_date: issueDate,
        notes: notes || undefined,
        line_items: lineItems.map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
        })),
        status: "pending",  // ✅ Kesilmiş fatura olarak kaydet
        invoice_id: editInvoiceId || undefined,  // ✅ Update varsa ID
        invoice_number: invoiceNumber, // ✅ Manuel atanan fatura numarası
      });

      if (response.success) {
        addToast("success", "✅ Fatura Kesildi!", response.message);
        
        setTimeout(() => {
          router.push("/invoices");
        }, 2000);
      } else {
        const errorDetails = response.errors ? Object.values(response.errors).join(" | ") : "";
        const fullMessage = errorDetails ? `${response.message} (${errorDetails})` : response.message;
        addToast("error", "❌ Hata Oluştu", fullMessage);
      }
    } catch (error) {
      console.error("Issue invoice error:", error);
      addToast("error", "❌ Bağlantı Hatası", "Sunucu ile iletişim kurulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  // Validate and submit (LEGACY - for backward compatibility)
  const handleSubmit = async () => {
    handleSaveDraft();
  }

  const totals = calculateTotals();

  // ✅ Loading skeleton
  if (isInitialLoading) {
    return (
      <div className="w-full bg-slate-50 min-h-screen">
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
          {/* Header skeleton */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="h-10 bg-slate-200 rounded-lg w-1/3 animate-pulse"></div>
              <div className="h-12 bg-slate-200 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="col-span-4 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="h-10 bg-slate-200 rounded-lg w-2/3 animate-pulse"></div>
              <div className="h-12 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Table skeleton */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <div className="bg-slate-100 p-6 h-20 border-b border-slate-200">
              <div className="h-4 bg-slate-300 rounded w-1/4 animate-pulse"></div>
            </div>
            <div className="space-y-4 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Summary skeleton */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50">
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 max-w-md">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} />
        ))}
      </div>

      {/* Main Form */}
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
        {/* Top Panel: Type & Header Info */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left: Fatura Tipi & Cari Seçimi */}
          <section className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                <button
                  onClick={() => setInvoiceType("sales")}
                  className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${
                    invoiceType === "sales"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-700"
                  }`}
                >
                  Satış Faturası
                </button>
                <button
                  onClick={() => setInvoiceType("purchase")}
                  className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${
                    invoiceType === "purchase"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-700"
                  }`}
                >
                  Alış Faturası
                </button>
              </div>
              <div className="flex items-center gap-4 text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide">Durum:</span>
                <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> TASLAK
                </span>
              </div>
            </div>

            {/* Contact Search */}
            <div className="space-y-6">
              <div className="relative" ref={contactSearchRef}>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Müşteri / Cari Ara
                </label>
                <div className="flex items-center bg-slate-50 border-2 border-slate-300 rounded-lg px-4 focus-within:border-purple-400 transition-all">
                  <span className="material-symbols-outlined text-slate-400">search</span>
                  <input
                    className="w-full bg-transparent border-none focus:ring-0 py-3 text-base placeholder:text-slate-400 font-medium"
                    placeholder="Ünvan veya Vergi No yazın..."
                    type="text"
                    value={contactSearch}
                    onChange={(e) => handleContactSearch(e.target.value)}
                    onFocus={() => contactSearch.length > 0 && setShowContactSuggestions(true)}
                  />
                </div>

                {/* Contact Suggestions */}
                {showContactSuggestions && contactSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-md z-50">
                    {contactSuggestions.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-200 last:border-b-0"
                      >
                        <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                        <p className="text-xs text-slate-600">{contact.tax_number}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Contact Info */}
              {selectedContact ? (
                <div className="flex gap-4 bg-slate-100 border border-slate-300 rounded-lg p-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">business</span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{selectedContact.name}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">{selectedContact.type === "customer" ? "Müşteri" : "Tedarikçi"}</p>
                    </div>
                    <div className="text-right">
                      {selectedContact.tax_number && (
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold">Vergi No:</span> {selectedContact.tax_number}
                        </p>
                      )}
                      {selectedContact.tax_office && (
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="font-semibold">Vergi Dairesi:</span> {selectedContact.tax_office}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedContact(null)}
                    className="text-slate-500 hover:text-red-600 transition-colors self-center"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-600">
                    <span className="material-symbols-outlined text-lg align-middle mr-2">info</span>
                    Lütfen fatura kesilecek cariyi yukarıdan aratarak seçiniz.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Right: Fatura Metadata */}
          <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Fatura No
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-base font-bold text-slate-700 select-none cursor-not-allowed"
                  type="text"
                  readOnly
                  value={invoiceNumber || "..."}
                  placeholder="Otomatik Atanacak"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Düzenleme Tarihi
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-base text-slate-700"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Dynamic Product Table */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-6 py-5 text-xs font-semibold uppercase text-slate-700 tracking-wide">Hizmet / Ürün</th>
                <th className="px-6 py-5 text-xs font-semibold uppercase text-slate-700 tracking-wide w-28">Miktar</th>
                <th className="px-6 py-5 text-xs font-semibold uppercase text-slate-700 tracking-wide w-32">
                  Birim Fiyat (₺)
                </th>
                <th className="px-6 py-5 text-xs font-semibold uppercase text-slate-700 tracking-wide w-24">KDV %</th>
                <th className="px-6 py-5 text-xs font-semibold uppercase text-slate-700 tracking-wide w-32 text-right">
                  Satır Toplamı
                </th>
                <th className="px-6 py-5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item) => {
                const lineSubtotal = item.quantity * item.unit_price;
                const lineVat = lineSubtotal * (item.vat_rate / 100);
                const lineTotal = lineSubtotal + lineVat;
                const hasStockWarning = invoiceType === "sales" && (item.stock_quantity || 0) < item.quantity;

                return (
                  <tr key={item.id} className={`group hover:bg-slate-50 transition-colors ${hasStockWarning ? "bg-red-50" : ""}`}>
                    <td className="px-6 py-6">
                      <div className="space-y-2 relative" ref={(el) => { if (el) productSearchRef.current[item.id] = el; }}>
                        <input
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-on-surface"
                          placeholder="Ürün adı ara..."
                          type="text"
                          disabled={!!item.product_id}
                          value={
                            item.product_name 
                              ? `${item.product_name} (${item.product_id})`
                              : productSearch[item.id] || ""
                          }
                          onChange={(e) => {
                            if (!item.product_id) {
                              handleProductSearch(item.id, e.target.value);
                            }
                          }}
                          onFocus={() => {
                            if (!item.product_id && (productSearch[item.id]?.length || 0) > 0) {
                              setShowProductSuggestions((prev) => ({ ...prev, [item.id]: true }));
                            }
                          }}
                        />
                        {item.product_name && (
                          <>
                            <p className="text-xs text-slate-600">Mevcut Stok: {item.stock_quantity} Adet</p>
                            <button
                              type="button"
                              onClick={() => {
                                setLineItems((prev) =>
                                  prev.map((i) =>
                                    i.id === item.id
                                      ? { ...i, product_id: "", product_name: undefined, stock_quantity: 0, unit_price: 0 }
                                      : i
                                  )
                                );
                                setProductSearch((prev) => ({ ...prev, [item.id]: "" }));
                              }}
                              className="text-xs text-primary font-semibold hover:underline"
                            >
                              Değiştir
                            </button>
                          </>
                        )}

                        {/* Product Suggestions */}
                        {showProductSuggestions[item.id] && productSuggestions[item.id]?.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-md z-50">
                            {productSuggestions[item.id].map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleSelectProduct(item.id, product)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-200 last:border-b-0"
                              >
                                <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                                <p className="text-xs text-slate-600">Stok: {product.stock_quantity} • Fiyat: {(invoiceType === "sales" ? product.sale_price : product.purchase_price).toFixed(2)}₺</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center border-2 border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                        <input
                          className={`w-full bg-transparent border-none focus:ring-0 text-center py-2 text-base font-semibold ${
                            hasStockWarning ? "text-red-600 font-bold" : "text-slate-900"
                          }`}
                          type="number"
                          min="0"
                          value={item.quantity === 0 ? "" : item.quantity}
                          placeholder="0"
                          onChange={(e) => updateLineItem(item.id, "quantity", e.target.value === "" ? 0 : parseInt(e.target.value))}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <input
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg px-3 py-2 text-base font-semibold focus:ring-purple-500 focus:border-purple-500"
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price === 0 ? "" : item.unit_price}
                        placeholder="0.00"
                        onChange={(e) => updateLineItem(item.id, "unit_price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-6 py-6">
                      <select
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg px-3 py-2 text-base font-semibold focus:ring-purple-500 focus:border-purple-500"
                        value={item.vat_rate}
                        onChange={(e) => updateLineItem(item.id, "vat_rate", parseInt(e.target.value) || 0)}
                      >
                        <option value="1">%1</option>
                        <option value="10">%10</option>
                        <option value="20">%20</option>
                      </select>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className={`text-base font-bold ${hasStockWarning ? "text-red-600" : "text-slate-900"}`}>
                        {lineTotal.toFixed(2)} ₺
                      </span>
                      {hasStockWarning && (
                        <p className="text-xs text-red-600 font-bold flex items-center gap-1 justify-end mt-2">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Stok Yetersiz!
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-6 text-center">
                      <button type="button" onClick={() => deleteLineItem(item.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-6 py-5 border-t border-slate-200 bg-slate-50 flex justify-between">
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Yeni Satır Ekle
            </button>
          </div>
        </section>

        {/* Bottom Section: Notes & Summary */}
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 lg:col-span-7">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              Fatura Notları
            </label>
            <textarea
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-400"
              placeholder="Müşteriye iletilmesini istediğiniz özel notları buraya ekleyin..."
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-8 space-y-4 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-semibold">Ara Toplam</span>
                <span className="font-bold text-slate-900 text-base">{totals.subtotal.toFixed(2)} ₺</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-semibold">KDV Toplamı</span>
                <span className="font-bold text-slate-900 text-base">{totals.vatTotal.toFixed(2)} ₺</span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-900">Genel Toplam</span>
                <span className="font-extrabold text-3xl bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">{totals.total.toFixed(2)} ₺</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={handleSaveDraft}
                disabled={isLoading || !selectedContact || lineItems.length === 0}
                className="flex-1 px-8 py-4 rounded-lg font-semibold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">draft</span>
                Taslak Kaydet
              </button>
              <button
                type="button"
                onClick={handleIssueAndProcess}
                disabled={isLoading || !selectedContact || lineItems.length === 0}
                className="flex-[1.5] px-8 py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <span className="material-symbols-outlined text-lg">{isLoading ? "sync" : "check_circle"}</span>
                {isLoading ? "İşleniyor..." : "Kesildi - Stoktan Düş"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
