"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { fetchDefaultCurrency } from "@/lib/defaultCurrency";

interface Contact {
  id: string;
  name: string;
  company_name?: string | null;
}

interface Product {
  id: string;
  name: string;
  sale_price?: number | null;                  // TRY karşılığı
  sale_price_in_currency?: number | null;      // orijinal currency'de
  currency?: string | null;                    // ürünün orijinal currency'si
  tax_rate?: number | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

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
                updateItem(item.id, "price", convertProductPrice(p));
                updateItem(item.id, "vatRate", p.tax_rate || 20);
                setSearchTerm(p.name);
                setIsOpen(false);
                setShowProductSuggestions((prev) => ({ ...prev, [item.id]: false }));
              }}
            >
              <div className="text-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Fiyat: {CURRENCY_SYMBOLS[formCurrency] ?? formCurrency}{convertProductPrice(p).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} | KDV: %{p.tax_rate}
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
                Fiyat: {CURRENCY_SYMBOLS[formCurrency] ?? formCurrency}{convertProductPrice(p).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} | KDV: %{p.tax_rate}
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
  const { rates, convertFull } = useCurrencyConverter();

  const [items, setItems] = useState<QuoteItem[]>([
    { id: "1", product_id: undefined, name: "", quantity: 1, unit: "Adet", price: 0, vatRate: 20 },
  ]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [contactId, setContactId] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [validityDays, setValidityDays] = useState("15 Gun");
  const [notes, setNotes] = useState("");
  // Teklif kesim para birimi — varsayılan işletme default'u, kullanıcı değiştirebilir.
  const [currency, setCurrency] = useState<string>("TRY");
  const prevCurrencyRef = useRef<string>("TRY");

  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode] = useState(!!editQuoteId);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [productSuggestions, setProductSuggestions] = useState<Record<string, Product[]>>({});
  const [showProductSuggestions, setShowProductSuggestions] = useState<Record<string, boolean>>({});

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  // Ürünün fiyatını teklif currency'sine çevirir.
  // Ürün kendi currency'sinde fiyatlandırılmışsa ve teklif aynı currency ise direkt
  // _in_currency değerini kullanır; aksi halde TRY karşılığı üzerinden convertFull.
  const convertProductPrice = (p: Product): number => {
    if (!p) return 0;
    if (p.currency && p.currency === currency && p.sale_price_in_currency != null) {
      return Number(p.sale_price_in_currency) || 0;
    }
    const tryPrice = Number(p.sale_price) || 0;
    if (currency === "TRY") return tryPrice;
    return convertFull(tryPrice, "TRY", currency);
  };

  // Kullanıcı currency değiştirince mevcut kalem fiyatlarını da çevir
  useEffect(() => {
    if (!rates) return;
    if (prevCurrencyRef.current === currency) return;
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        price: convertFull(it.price, prevCurrencyRef.current, currency),
      }))
    );
    prevCurrencyRef.current = currency;
  }, [currency, rates, convertFull]);

  useEffect(() => {
    const init = async () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      setQuoteNumber((prev) => prev || `TEK-${year}-${month}-${day}-${randomNum}`);
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
      }

      const { data: contactsData } = await supabase.from("contacts").select("*").order("name");
      if (contactsData) setContacts(contactsData as Contact[]);

      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, sale_price, sale_price_in_currency, currency, tax_rate")
        .order("name");
      if (productsData) setProducts(productsData as Product[]);

      if (editQuoteId) {
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("*")
          .eq("id", editQuoteId)
          .single();

        if (quoteData) {
          setContactId(quoteData.contact_id);
          setQuoteNumber(quoteData.quote_number);
          setIssueDate(quoteData.issue_date || new Date().toISOString().split("T")[0]);
          setNotes(quoteData.notes || "");
          if (quoteData.currency) {
            setCurrency(quoteData.currency);
            prevCurrencyRef.current = quoteData.currency;
          }
          const dayNum = quoteData.validity_days;
          const validityStr = dayNum === 7 ? "7 Gun" : dayNum === 15 ? "15 Gun" : dayNum === 30 ? "30 Gun" : "Ozel";
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
      .select("id, name, sale_price, sale_price_in_currency, currency, tax_rate")
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Oturum açmış kullanıcı bulunamadı. Lütfen giriş yapın.");
      setUserId(user.id);

      const subtotal = validItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const tax_total = validItems.reduce(
        (sum, item) => sum + item.quantity * item.price * (item.vatRate / 100),
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

      if (editQuoteId) {
        const { data: updated, error: updateError } = await supabase
          .from("quotes")
          .update({
            contact_id: contactId,
            quote_number: quoteNumber.trim(),
            issue_date: issueDate,
            subtotal,
            tax_total,
            total_amount,
            currency,
            exchange_rate: exchangeRate,
            notes,
            validity_days: parseValidityDays(validityDays),
          })
          .eq("id", editQuoteId)
          .select()
          .single();

        if (updateError) throw updateError;
        quoteData = updated;

        await supabase.from("quote_items").delete().eq("quote_id", editQuoteId);
      } else {
        const { data: created, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            user_id: user.id,
            contact_id: contactId,
            quote_number: quoteNumber.trim() || fallbackQuoteNumber,
            issue_date: issueDate,
            subtotal,
            tax_total,
            total_amount,
            currency,
            exchange_rate: exchangeRate,
            notes,
            status: "Pending",
            validity_days: parseValidityDays(validityDays),
          })
          .select()
          .single();

        if (quoteError) throw quoteError;
        quoteData = created;
      }

      const itemsToInsert = validItems.map((item) => ({
        quote_id: quoteData.id,
        product_id: item.product_id || null,
        quantity: item.quantity,
        unit_price: item.price,
        vat_rate: item.vatRate,
        line_total: item.quantity * item.price * (1 + item.vatRate / 100),
      }));

      const { error: itemsError } = await supabase.from("quote_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;

      const message = editQuoteId ? "Teklif başarıyla güncellendi!" : "Teklif başarıyla oluşturuldu!";
      setSuccessMsg(message + " Yönlendiriliyorsunuz...");
      addToast("success", "Başarılı", message);
      setTimeout(() => {
        router.push("/quotes");
      }, 1200);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Teklif kaydedilirken beklenmeyen bir hata oluştu.");
      addToast("error", "Hata", err.message || "Teklif kaydedilirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
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

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditMode ? "Teklifi Düzenle" : "Yeni Teklif"}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              {isEditMode ? "Mevcut teklif bilgilerini güncelleyin" : "Yeni bir teklif oluşturun"}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-indigo-100 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Para Birimi:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-transparent border-none text-sm font-black text-indigo-600 outline-none focus:ring-0 cursor-pointer"
            >
              <option value="TRY">TRY (₺)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
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

        {/* TOP ROW: 2 Column Grid - Müşteri & Teklif Detayları */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Card: Müşteri Seçimi */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">MÜŞTERİ / CARİ SEÇIMI</h3>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Ünvan veya Vergi No yazın..."
                  className="w-full pl-10 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-lg flex-shrink-0 mt-0.5">info</span>
                <span>Lütfen teklif kesilebilecek cariyi aşağıdan seçiniz</span>
              </div>

              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">Müşteri Seçiniz...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.company_name || "Bilinmeyen"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Card: Teklif Detayları */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">TEKLİF DETAYLARI</h3>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">TEKLİF NO</label>
                <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">TEKLİF TARİHİ</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">GEÇERLİLİK SÜRESİ</label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="7 Gun">7 Gün</option>
                  <option value="15 Gun">15 Gün</option>
                  <option value="30 Gun">30 Gün</option>
                  <option value="Ozel">Özel</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: Full-Width Table Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">TEKLİF KALEMLERİ</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              + Yeni Satır Ekle
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">HİZMET / ÜRÜN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">MİKTAR</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">BİRİM FİYAT ({symbol})</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">KDV %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">SATIR TOPLAMI</th>
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
                          formCurrency={currency}
                          convertProductPrice={convertProductPrice}
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
                        {symbol}{total.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
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

        {/* BOTTOM ROW: Flex Layout - Notlar + Toplam + Butonlar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Notlar */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">TEKLİF NOTLARI</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Müşteriye iletilmesini istediğiniz özel notları buraya gileyein..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-32 resize-none text-sm"
            />
          </div>

          {/* Right: Totals Summary + Buttons */}
          <div className="space-y-4">
            {/* Totals Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-3">
              {(() => {
                const sub = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
                const tax = items.reduce((sum, item) => sum + item.quantity * item.price * (item.vatRate / 100), 0);
                const total = sub + tax;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Ara Toplam</span>
                      <span className="font-semibold text-slate-900">{symbol}{sub.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">KDV Toplamı</span>
                      <span className="font-semibold text-slate-900">{symbol}{tax.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 flex justify-between">
                      <span className="font-semibold text-slate-900">Genel Toplam</span>
                      <span className="text-xl font-bold text-indigo-600">{symbol}{total.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-3">
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-lg">visibility</span>
                Teklif Önizle
              </button>
              
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {isLoading ? "progress_activity" : "check_circle"}
                </span>
                {isLoading ? "Kaydediliyor..." : (isEditMode ? "Teklifi Güncelle" : "Teklifi Kaydet")}
              </button>

              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-lg">draft</span>
                Taslak
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
