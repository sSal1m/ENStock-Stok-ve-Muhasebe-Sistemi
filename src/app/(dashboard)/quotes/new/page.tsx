"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Contact {
  id: string;
  name: string;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
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

const Breadcrumbs = () => (
  <nav className="flex text-label-sm text-slate-500 gap-2 items-center">
    <Link className="hover:text-indigo-600" href="#">Panel</Link>
    <span className="material-symbols-outlined text-xs">chevron_right</span>
    <Link className="hover:text-indigo-600" href="/quotes">Satislar</Link>
    <span className="material-symbols-outlined text-xs">chevron_right</span>
    <span className="text-slate-900 font-bold">Yeni Teklif</span>
  </nav>
);

const ClientSelection = ({
  contacts,
  contactId,
  setContactId,
  issueDate,
  setIssueDate,
  validityDays,
  setValidityDays,
  quoteNumber,
  setQuoteNumber,
}: any) => (
  <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface">Musteri Sec</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">person_search</span>
          <select
            className="w-full pl-10 border-slate-300 rounded-lg text-body-sm focus:border-indigo-600 focus:ring-indigo-600 bg-slate-50"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Musteri Seciniz...</option>
            {contacts.map((c: Contact) => (
              <option key={c.id} value={c.id}>
                {c.name ||
                  c.company_name ||
                  [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                  "Bilinmeyen Musteri"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface">Teklif Tarihi</label>
          <input
            className="w-full border-slate-300 rounded-lg text-body-sm focus:border-indigo-600 focus:ring-indigo-600 bg-slate-50"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface">Gecerlilik Suresi</label>
          <select
            className="w-full border-slate-300 rounded-lg text-body-sm focus:border-indigo-600 focus:ring-indigo-600 bg-slate-50"
            value={validityDays}
            onChange={(e) => setValidityDays(e.target.value)}
          >
            <option value="7 Gun">7 Gun</option>
            <option value="15 Gun">15 Gun</option>
            <option value="30 Gun">30 Gun</option>
            <option value="Ozel">Ozel</option>
          </select>
        </div>
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="font-label-md text-label-md text-on-surface">Teklif Numarasi</label>
        <input
          className="w-full border-slate-300 rounded-lg text-body-sm focus:border-indigo-600 focus:ring-indigo-600 bg-slate-50"
          type="text"
          value={quoteNumber}
          onChange={(e) => setQuoteNumber(e.target.value)}
        />
      </div>
    </div>
  </div>
);

const QuickSummary = () => (
  <div className="col-span-12 lg:col-span-4 bg-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
    <div className="relative z-10">
      <h3 className="text-title-lg mb-2">Hizli Ozet</h3>
      <p className="text-body-sm opacity-80 mb-6">Mevcut teklif detaylari hemen yansitilir. Kalemleri ekleyerek baslayin.</p>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-200">verified_user</span>
        <span className="text-label-sm">Otomatik Kayit Aktif</span>
      </div>
    </div>
    <div className="absolute -right-10 -bottom-10 opacity-10">
      <span className="material-symbols-outlined" style={{ fontSize: "160px" }}>receipt_long</span>
    </div>
  </div>
);

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
      <div className="flex items-center w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 transition-all">
        <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">inventory_2</span>
        <input
          className="w-full border-none p-0 focus:ring-0 text-body-sm bg-transparent placeholder:text-slate-400"
          placeholder="Urun adi giriniz veya arayiniz..."
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
          className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors ml-2 text-[20px]"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </div>

      {(isOpen || showProductSuggestions[item.id]) && (filteredProducts.length > 0 || remoteSuggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
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
              <div className="text-body-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-label-sm text-slate-400 mt-0.5">
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
              <div className="text-body-sm font-medium text-slate-900">{p.name}</div>
              <div className="text-label-sm text-slate-400 mt-0.5">
                Fiyat: ₺{p.sale_price} | KDV: %{p.tax_rate}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const QuoteItemsTable = ({
  items,
  updateItem,
  addItem,
  removeItem,
  products,
  productSuggestions,
  showProductSuggestions,
  setShowProductSuggestions,
  onSearch,
}: {
  items: QuoteItem[];
  updateItem: any;
  addItem: any;
  removeItem: any;
  products: Product[];
  productSuggestions: Record<string, Product[]>;
  showProductSuggestions: Record<string, boolean>;
  setShowProductSuggestions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSearch: (id: string, term: string) => void;
}) => (
  <div className="col-span-12 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
      <h3 className="text-title-lg text-slate-900">Teklif Kalemleri</h3>
      <button
        onClick={addItem}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-label-md"
      >
        <span className="material-symbols-outlined">add_circle</span>
        Satir Ekle
      </button>
    </div>
    <div className="w-full">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider w-12 text-center">#</th>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider">Urun/Hizmet</th>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider w-32">Miktar</th>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider w-24">Birim</th>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider w-40 text-right">Birim Fiyat</th>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider w-24 text-center">KDV (%)</th>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider w-40 text-right">Toplam</th>
            <th className="px-6 py-3 w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const total = item.quantity * item.price * (1 + item.vatRate / 100);
            return (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-body-sm text-slate-500 text-center">{index + 1}</td>
                <td className="px-6 py-4">
                  <ProductSelect
                    item={item}
                    updateItem={updateItem}
                    products={products}
                    productSuggestions={productSuggestions}
                    showProductSuggestions={showProductSuggestions}
                    setShowProductSuggestions={setShowProductSuggestions}
                    onSearch={onSearch}
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    className="w-full border-slate-300 bg-slate-50 rounded-lg text-body-sm text-center focus:border-indigo-600 focus:ring-indigo-600"
                    type="number"
                    min="1"
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(item.id, "quantity", e.target.value ? Number(e.target.value) : 0)}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-slate-600 text-body-sm font-medium">Adet</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₺</span>
                    <input
                      className="w-full border-slate-300 bg-slate-50 rounded-lg text-body-sm text-right pl-8 focus:border-indigo-600 focus:ring-indigo-600"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price === 0 && !item.name ? "" : item.price}
                      onChange={(e) => updateItem(item.id, "price", e.target.value ? Number(e.target.value) : 0)}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <select
                    className="w-full border-slate-300 bg-slate-50 rounded-lg text-body-sm text-center focus:border-indigo-600 focus:ring-indigo-600"
                    value={item.vatRate}
                    onChange={(e) => updateItem(item.id, "vatRate", Number(e.target.value))}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-900">
                  ₺ {total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className={`transition-colors ${items.length === 1 ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-red-500"}`}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const QuoteNotes = ({ notes, setNotes }: any) => (
  <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <h4 className="font-label-md text-label-md text-slate-900 mb-4">Teklif Notlari</h4>
    <textarea
      className="w-full h-32 border-slate-200 rounded-lg text-body-sm focus:ring-indigo-600 focus:border-indigo-600 placeholder:text-slate-400"
      placeholder="Orn: Odeme teklif onayindan sonra 7 is gunu icinde pesin olarak yapilacaktir."
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
    ></textarea>
  </div>
);

const QuoteTotals = ({ items }: { items: QuoteItem[] }) => {
  const { subtotal, totalVat, grandTotal } = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const vat = items.reduce((sum, item) => sum + item.quantity * item.price * (item.vatRate / 100), 0);
    return {
      subtotal: sub,
      totalVat: vat,
      grandTotal: sub + vat,
    };
  }, [items]);

  return (
    <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <span className="text-body-sm text-slate-500">Ara Toplam</span>
        <span className="text-body-md font-semibold text-slate-900">
          ₺ {subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <span className="text-body-sm text-slate-500">Toplam KDV</span>
        <span className="text-body-md font-semibold text-slate-900">
          ₺ {totalVat.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex justify-between items-center pt-2">
        <span className="text-title-lg text-slate-900">Genel Toplam</span>
        <span className="text-title-lg font-bold text-indigo-600">
          ₺ {grandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

const QuoteActions = ({ onSave, isLoading }: any) => (
  <div className="col-span-12 flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <button className="text-slate-500 hover:text-slate-900 text-label-md px-6 py-2.5 transition-colors">
      Vazgec
    </button>
    <div className="flex gap-4 w-full md:w-auto">
      <button className="flex-1 md:flex-none border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-lg text-label-md transition-colors">
        Taslak Olarak Kaydet
      </button>
      <button
        onClick={onSave}
        disabled={isLoading}
        className={`flex-1 md:flex-none ${
          isLoading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
        } text-white px-8 py-2.5 rounded-lg text-label-md flex items-center justify-center gap-2 transition-colors`}
      >
        {isLoading ? (
          <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">send</span>
        )}
        {isLoading ? "Yukleniyor..." : "Teklifi Kaydet ve Gonder"}
      </button>
    </div>
  </div>
);

export default function NewQuotePage() {
  const router = useRouter();

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

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [productSuggestions, setProductSuggestions] = useState<Record<string, Product[]>>({});
  const [showProductSuggestions, setShowProductSuggestions] = useState<Record<string, boolean>>({});

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

      const { data: contactsData } = await supabase.from("contacts").select("*").order("name");
      if (contactsData) setContacts(contactsData as Contact[]);

      const { data: productsData } = await supabase.from("products").select("*").order("name");
      if (productsData) setProducts(productsData as Product[]);
    };

    init();
  }, [router]);

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
      setErrorMsg("Lutfen bir musteri seciniz.");
      addToast("error", "Hata", "Lutfen bir musteri seciniz.");
      return;
    }

    if (!quoteNumber.trim()) {
      setErrorMsg("Lutfen teklif numarasi giriniz.");
      addToast("error", "Hata", "Lutfen teklif numarasi giriniz.");
      return;
    }

    if (items.some((item) => !(item.name || "").trim())) {
      setErrorMsg("Lutfen tum teklif kalemlerinin urun adini giriniz.");
      addToast("error", "Hata", "Lutfen tum teklif kalemlerinin urun adini giriniz.");
      return;
    }

    const validItems = items.filter((item) => item.product_id || (item.name || "").trim());
    if (validItems.length === 0) {
      setErrorMsg("Lutfen en az bir gecerli urun secin.");
      addToast("error", "Hata", "Lutfen en az bir gecerli urun secin.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Oturum acmis kullanici bulunamadi. Lutfen giris yapin.");
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

      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          contact_id: contactId,
          quote_number: quoteNumber.trim() || fallbackQuoteNumber,
          issue_date: issueDate,
          subtotal,
          tax_total,
          total_amount,
          notes,
          status: "Pending",
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

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

      setSuccessMsg("Teklif basariyla kaydedildi! Yonlendiriliyorsunuz...");
      addToast("success", "Basarili", "Teklif basariyla olusturuldu.");
      setTimeout(() => {
        router.push("/quotes");
      }, 1200);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Teklif kaydedilirken beklenmeyen bir hata olustu.");
      addToast("error", "Hata", err.message || "Teklif kaydedilirken bir hata olustu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-margin-page min-h-screen text-on-background">
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-4 transition-all
            ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : ""}
            ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : ""}`}
          >
            <div>
              <p className="font-bold text-sm">{toast.title}</p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-container-max mx-auto space-y-stack-lg">
        <div className="flex items-center justify-between gap-6">
          <Breadcrumbs />
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? "Kaydediliyor..." : "Teklifi Kaydet"}
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter">
          <ClientSelection
            contacts={contacts}
            contactId={contactId}
            setContactId={setContactId}
            issueDate={issueDate}
            setIssueDate={setIssueDate}
            validityDays={validityDays}
            setValidityDays={setValidityDays}
            quoteNumber={quoteNumber}
            setQuoteNumber={setQuoteNumber}
          />
          <QuickSummary />
          <QuoteItemsTable
            items={items}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            products={products}
            productSuggestions={productSuggestions}
            showProductSuggestions={showProductSuggestions}
            setShowProductSuggestions={setShowProductSuggestions}
            onSearch={handleProductSearch}
          />
          <QuoteNotes notes={notes} setNotes={setNotes} />
          <QuoteTotals items={items} />
          <QuoteActions onSave={handleSave} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
