"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { fetchDefaultCurrency } from "@/lib/defaultCurrency";
import { toast, Toaster } from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchTeamQuoteById, saveQuoteAction } from "../actions";
import { fetchTeamScopedData } from "@/app/(dashboard)/teamActions";

interface Contact {
  id: string;
  name: string;
  company_name?: string | null;
  tax_number?: string | null;
  tax_office?: string | null;
  type?: string | null;
}

interface Product {
  id: string;
  name: string;
  sale_price?: number | null;                  // TRY karşılığı
  sale_price_in_currency?: number | null;      // orijinal currency'de
  currency?: string | null;                    // ürünün orijinal currency'si
  tax_rate?: number | null;
  stock_quantity?: number | null;
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const ProductSelect = ({
  item,
  updateItem,
  products,
  productSuggestions,
  showProductSuggestions,
  setShowProductSuggestions,
  onSearch,
  formCurrency,
  convertProductPrice,
}: {
  item: QuoteItem;
  updateItem: any;
  products: Product[];
  productSuggestions: Record<string, Product[]>;
  showProductSuggestions: Record<string, boolean>;
  setShowProductSuggestions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSearch: (id: string, term: string) => void;
  formCurrency: string;
  convertProductPrice: (product: Product) => number;
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
      <div className="flex items-center w-full border-2 border-slate-300 rounded-lg px-4 py-3 bg-slate-50 focus-within:border-purple-400 transition-all">
        <span className="material-symbols-outlined text-slate-400 mr-2 text-sm">inventory_2</span>
        <input
          className="w-full border-none p-0 focus:ring-0 text-sm bg-transparent placeholder:text-slate-400 font-semibold text-slate-900 outline-none"
          placeholder="Ürün adı ara..."
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
          className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-purple-600 transition-colors ml-2 text-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </div>

      {(isOpen || showProductSuggestions[item.id]) && (filteredProducts.length > 0 || remoteSuggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                updateItem(item.id, "product_id", p.id);
                updateItem(item.id, "name", p.name);
                updateItem(item.id, "price", convertProductPrice(p));
                updateItem(item.id, "vatRate", p.tax_rate || 20);
                setSearchTerm(p.name);
                setIsOpen(false);
                setShowProductSuggestions((prev) => ({ ...prev, [item.id]: false }));
              }}
            >
              <div className="text-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Stok: {p.stock_quantity || 0} • Fiyat: {CURRENCY_SYMBOLS[formCurrency] ?? formCurrency}{convertProductPrice(p).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} | KDV: %{p.tax_rate}
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
                updateItem(item.id, "price", convertProductPrice(p));
                updateItem(item.id, "vatRate", p.tax_rate || 20);
                setSearchTerm(p.name);
                setIsOpen(false);
                setShowProductSuggestions((prev) => ({ ...prev, [item.id]: false }));
              }}
            >
              <div className="text-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Stok: {p.stock_quantity || 0} • Fiyat: {CURRENCY_SYMBOLS[formCurrency] ?? formCurrency}{convertProductPrice(p).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} | KDV: %{p.tax_rate}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editQuoteId = searchParams.get("id");
  const { hasPermission, isLoading: permsLoading } = usePermissions();

  const { rates, convertFull } = useCurrencyConverter();

  const [items, setItems] = useState<QuoteItem[]>([
    { id: "1", product_id: undefined, name: "", quantity: 1, unit: "Adet", price: 0, vatRate: 20 },
  ]);

  useEffect(() => {
    if (!permsLoading) {
      const requiredPermission = editQuoteId ? "edit" : "create";
      if (!hasPermission("quotes", requiredPermission)) {
        toast.error("Bu işlem için yetkiniz bulunmamaktadır.");
        router.replace("/quotes");
      }
    }
  }, [permsLoading, hasPermission, router, editQuoteId]);

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

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [contactId, setContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const contactSearchRef = useRef<HTMLDivElement>(null);

  // Click outside to close contact suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactSearchRef.current && !contactSearchRef.current.contains(event.target as Node)) {
        setShowContactSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [quoteNumber, setQuoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [validityDays, setValidityDays] = useState("15 Gun");
  const [notes, setNotes] = useState("");
  
  // Teklif kesim para birimi
  const [currency, setCurrency] = useState<string>("TRY");
  const prevCurrencyRef = useRef<string>("TRY");

  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode] = useState(!!editQuoteId);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [productSuggestions, setProductSuggestions] = useState<Record<string, Product[]>>({});
  const [showProductSuggestions, setShowProductSuggestions] = useState<Record<string, boolean>>({});

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const convertProductPrice = (p: Product): number => {
    if (!p) return 0;
    if (p.currency && p.currency === currency && p.sale_price_in_currency != null) {
      return Number(p.sale_price_in_currency) || 0;
    }
    const tryPrice = Number(p.sale_price) || 0;
    if (currency === "TRY") return tryPrice;
    return convertFull(tryPrice, "TRY", currency);
  };

  // Convert prices when currency is changed
  useEffect(() => {
    if (!rates) return;
    if (prevCurrencyRef.current === currency) return;
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        price: convertFull(Number(it.price) || 0, prevCurrencyRef.current, currency),
      }))
    );
    prevCurrencyRef.current = currency;
  }, [currency, rates, convertFull]);

  useEffect(() => {
    const init = async () => {
      setIssueDate(new Date().toISOString().split("T")[0]);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      // İşletme default currency — yeni teklif için başlangıç değeri
      if (!editQuoteId) {
        const defaultCur = await fetchDefaultCurrency(user.id);
        setCurrency(defaultCur);
        prevCurrencyRef.current = defaultCur;
        
        // Sıralı teklif numarası oluştur
        const { getNextQuoteNumber } = await import("../actions");
        const nextNum = await getNextQuoteNumber(user.id);
        setQuoteNumber((prev) => prev || nextNum);
      }

      const resContacts = await fetchTeamScopedData(user.id, "contacts", "*", { orderBy: "name" });
      const contactsData = resContacts.data;
      if (contactsData) setContacts(contactsData as Contact[]);

      const resProducts = await fetchTeamScopedData(user.id, "products", "id, name, sale_price, sale_price_in_currency, currency, tax_rate, stock_quantity", { orderBy: "name" });
      const productsData = resProducts.data;
      if (productsData) setProducts(productsData as Product[]);

      if (editQuoteId) {
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("*")
          .eq("id", editQuoteId)
          .single();

        if (quoteData) {
          setContactId(quoteData.contact_id);
          if (contactsData) {
            const selected = (contactsData as Contact[]).find((c) => c.id === quoteData.contact_id);
            if (selected) {
              setSelectedContact(selected);
              setContactSearch(selected.name || "");
            }
          }
          setQuoteNumber(quoteData.quote_number);
          setIssueDate(quoteData.issue_date || new Date().toISOString().split("T")[0]);
          setNotes(quoteData.notes || "");
          if (quoteData.currency) {
            setCurrency(quoteData.currency);
            prevCurrencyRef.current = quoteData.currency;
          }
          const dayNum = quoteData.validity_days;
          const validityStr = dayNum === 7 ? "7 Gun" : dayNum === 15 ? "15 Gun" : dayNum === 30 ? "30 Gun" : `${dayNum} Gun`;
          setValidityDays(validityStr);

          const { data: itemsData } = await supabase
            .from("quote_items")
            .select("*")
            .eq("quote_id", editQuoteId);

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
        }
      }
    };

    init();
  }, [editQuoteId, router]);

  const parseValidityDays = (days: string): number => {
    const match = days.match(/\d+/);
    return match ? parseInt(match[0], 10) : 15;
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

    if (!userId) return;

    const res = await fetchTeamScopedData(userId, "products", "id, name, sale_price, sale_price_in_currency, currency, tax_rate, stock_quantity", {
      additionalFilters: [{ column: "name", operator: "ilike", value: `%${term}%` }],
      limit: 10
    });

    if (res.data) {
      setProductSuggestions((prev) => ({ ...prev, [id]: res.data as Product[] }));
      setShowProductSuggestions((prev) => ({ ...prev, [id]: true }));
    }
  };

  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleSave = async () => {
    if (!contactId) {
      setErrorMsg("Lütfen bir müşteri seçiniz.");
      toast.error("Lütfen bir müşteri seçiniz.");
      return;
    }

    if (!quoteNumber.trim()) {
      setErrorMsg("Lütfen teklif numarası giriniz.");
      toast.error("Lütfen teklif numarası giriniz.");
      return;
    }

    const validItems = items.filter((item) => item.product_id || (item.name || "").trim());
    if (validItems.length === 0) {
      setErrorMsg("Lütfen en az bir geçerli ürün seçin.");
      toast.error("Lütfen en az bir geçerli ürün seçin.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const toastId = toast.loading("Teklif kaydediliyor...");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Oturum açmış kullanıcı bulunamadı. Lütfen giriş yapın.");

      const subtotal = validItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
      const tax_total = validItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0) * (item.vatRate / 100),
        0
      );
      const total_amount = subtotal + tax_total;

      const fallbackTimestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
      const fallbackQuoteNumber = `TEK-${fallbackTimestamp}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`;

      let quoteData;

      // Teklif currency'sine göre exchange_rate (TCMB selling) — TRY için 1
      const exchangeRate = currency === "TRY" ? 1 : (rates?.[currency]?.selling || 1);

      const quoteToSave = {
        contact_id: contactId,
        quote_number: quoteNumber.trim() || fallbackQuoteNumber,
        issue_date: issueDate,
        subtotal,
        tax_total,
        total_amount,
        currency,
        exchange_rate: exchangeRate,
        notes,
        validity_days: parseValidityDays(validityDays),
        status: "Pending", // Will be ignored by update if not needed, but good for insert
      };

      const itemsToInsert = validItems.map((item) => ({
        product_id: item.product_id || null,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.price) || 0,
        vat_rate: item.vatRate,
        line_total: (Number(item.quantity) || 0) * (Number(item.price) || 0) * (1 + item.vatRate / 100),
      }));

      const result = await saveQuoteAction(user.id, quoteToSave, itemsToInsert, editQuoteId || undefined);

      if (!result.success) {
        throw new Error(result.error || "Teklif kaydedilemedi.");
      }

      const message = editQuoteId ? "Teklif başarıyla güncellendi!" : "Teklif başarıyla oluşturuldu!";
      setSuccessMsg(message + " Yönlendiriliyorsunuz...");
      toast.success(message, { id: toastId });
      setTimeout(() => {
        router.push("/quotes");
      }, 1200);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Teklif kaydedilirken beklenmeyen bir hata oluştu.");
      toast.error(err.message || "Teklif kaydedilirken bir hata oluştu.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      <Toaster position="top-right" />
      
      {/* Main Form */}
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
        {/* Messages */}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* TOP ROW: Müşteri Seçimi & Detayları */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left: Cari Seçimi */}
          <section className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Müşteri / Cari Seçimi
              </span>
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
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      setShowContactSuggestions(true);
                    }}
                    onFocus={() => setShowContactSuggestions(true)}
                  />
                </div>

                {/* Contact Suggestions */}
                {showContactSuggestions && contactSearch.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-md z-50 max-h-60 overflow-y-auto">
                    {contacts
                      .filter((c) =>
                        (c.name || "").toLowerCase().includes(contactSearch.toLowerCase()) ||
                        (c.tax_number || "").includes(contactSearch)
                      )
                      .map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setContactId(contact.id);
                            setSelectedContact(contact);
                            setContactSearch(contact.name || "");
                            setShowContactSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-200 last:border-b-0"
                        >
                          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-600">{contact.tax_number || ""}</p>
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
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        {selectedContact.type === "customer" ? "Müşteri" : "Tedarikçi"}
                      </p>
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
                    onClick={() => {
                      setContactId("");
                      setSelectedContact(null);
                      setContactSearch("");
                    }}
                    className="text-slate-500 hover:text-red-600 transition-colors self-center"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-600">
                    <span className="material-symbols-outlined text-lg align-middle mr-2">info</span>
                    Lütfen teklif kesilecek cariyi yukarıdan aratarak seçiniz.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Right: Teklif Metadata */}
          <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Teklif No
                </label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg py-3 px-4 text-base font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  type="text"
                  value={quoteNumber || ""}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="Teklif numarası girin"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Döviz Birimi
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-base font-bold text-primary focus:ring-purple-500 focus:border-purple-500"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
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
                  Birim Fiyat ({currency === "TRY" ? "₺" : currency})
                </th>
                <th className="px-6 py-5 text-xs font-semibold uppercase text-slate-700 tracking-wide w-24">KDV %</th>
                <th className="px-6 py-5 text-xs font-semibold uppercase text-slate-700 tracking-wide w-32 text-right">
                  Satır Toplamı
                </th>
                <th className="px-6 py-5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => {
                const qty = Number(item.quantity) || 0;
                const prc = Number(item.price) || 0;
                const total = qty * prc * (1 + item.vatRate / 100);
                return (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-6">
                      <ProductSelect
                        item={item}
                        updateItem={updateItem}
                        products={products}
                        productSuggestions={productSuggestions}
                        showProductSuggestions={showProductSuggestions}
                        setShowProductSuggestions={setShowProductSuggestions}
                        onSearch={handleProductSearch}
                        formCurrency={currency}
                        convertProductPrice={convertProductPrice}
                      />
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center border-2 border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity === 0 ? "" : item.quantity}
                          placeholder="0"
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value === "" ? 0 : Number(e.target.value))}
                          className="w-full bg-transparent border-none focus:ring-0 text-center py-2 text-base font-semibold text-slate-900"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price === 0 ? "" : item.price}
                        placeholder="0.00"
                        onChange={(e) => updateItem(item.id, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg px-3 py-2 text-base font-semibold focus:ring-purple-500 focus:border-purple-500"
                      />
                    </td>
                    <td className="px-6 py-6">
                      <select
                        value={item.vatRate}
                        onChange={(e) => updateItem(item.id, "vatRate", Number(e.target.value))}
                        className="w-40 bg-slate-50 border-2 border-slate-300 rounded-lg px-4 py-3 text-base font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 hover:border-slate-400 transition-all bg-white"
                      >
                        <option value="0">%0</option>
                        <option value="1">%1</option>
                        <option value="10">%10</option>
                        <option value="20">%20</option>
                      </select>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className="text-base font-bold text-slate-900">
                        {symbol}{total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="text-slate-400 hover:text-red-600 disabled:text-slate-200 disabled:cursor-not-allowed transition-colors"
                      >
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
              onClick={addItem}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Yeni Satır Ekle
            </button>
          </div>
        </section>

        {/* BOTTOM ROW: Flex Layout - Notlar + Toplam + Butonlar */}
        <div className="grid grid-cols-12 gap-6 items-end">
          {/* Left Column: Validity & Notes */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Validity Days selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Geçerlilik Süresi
              </label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <select
                  value={["7 Gun", "15 Gun", "30 Gun"].includes(validityDays) ? validityDays : "Ozel"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Ozel") {
                      setValidityDays("Ozel");
                    } else {
                      setValidityDays(val);
                    }
                  }}
                  className="w-full sm:w-64 bg-slate-50 border-2 border-slate-300 rounded-lg px-4 py-3 text-base font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 hover:border-slate-400 transition-all bg-white"
                >
                  <option value="7 Gun">7 Gün</option>
                  <option value="15 Gun">15 Gün</option>
                  <option value="30 Gun">30 Gün</option>
                  <option value="Ozel">Özel Süre</option>
                </select>
                
                {!["7 Gun", "15 Gun", "30 Gun"].includes(validityDays) && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="Gün sayısı giriniz..."
                      value={validityDays === "Ozel" ? "" : validityDays.replace(" Gun", "")}
                      onChange={(e) => setValidityDays(e.target.value ? e.target.value + " Gun" : "Ozel")}
                      className="w-full sm:w-48 bg-slate-50 border-2 border-slate-300 rounded-lg px-4 py-3 text-base font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                    />
                    <span className="text-slate-600 font-bold text-sm whitespace-nowrap">Gün</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Teklif Notları
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Müşteriye iletilmesini istediğiniz özel notları buraya ekleyin..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-400 h-32 resize-none"
              />
            </div>
          </div>

          {/* Right Column: Summary & Actions */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Totals Summary */}
            <div className="bg-white rounded-2xl p-8 space-y-4 shadow-sm border border-slate-200">
              {(() => {
                const sub = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
                const tax = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0) * (item.vatRate / 100), 0);
                const total = sub + tax;
                return (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-semibold">Ara Toplam</span>
                      <span className="font-bold text-slate-900 text-base">
                        {symbol}{sub.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-semibold">KDV Toplamı</span>
                      <span className="font-bold text-slate-900 text-base">
                        {symbol}{tax.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-900">Genel Toplam</span>
                      <span className="font-extrabold text-3xl bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                        {symbol}{total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Form Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/quotes")}
                className="flex-1 px-8 py-4 rounded-lg font-semibold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">cancel</span>
                İptal Et
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading || !contactId || items.length === 0}
                className="flex-[1.5] px-8 py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <span className="material-symbols-outlined text-lg">
                  {isLoading ? "sync" : "check_circle"}
                </span>
                {isLoading ? "Kaydediliyor..." : (isEditMode ? "Teklifi Güncelle" : "Teklifi Kaydet")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
