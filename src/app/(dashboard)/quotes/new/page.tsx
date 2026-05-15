<<<<<<< HEAD
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const Breadcrumbs = () => (
  <nav className="flex text-label-sm text-slate-500 gap-2 items-center">
    <Link className="hover:text-indigo-600" href="#">Panel</Link>
    <span className="material-symbols-outlined text-xs">chevron_right</span>
    <Link className="hover:text-indigo-600" href="/quotes">Satışlar</Link>
    <span className="material-symbols-outlined text-xs">chevron_right</span>
    <span className="text-slate-900 font-bold">Yeni Teklif</span>
  </nav>
);

const ClientSelection = ({ contacts, contactId, setContactId, issueDate, setIssueDate, validityDays, setValidityDays }: any) => (
  <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="font-label-md text-label-md text-on-surface">Müşteri Seç</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">person_search</span>
          <select 
            className="w-full pl-10 border-slate-300 rounded-lg text-body-sm focus:border-indigo-600 focus:ring-indigo-600 bg-slate-50" 
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Müşteri Seçiniz...</option>
            {contacts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name || c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Bilinmeyen Müşteri'}
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
          <label className="font-label-md text-label-md text-on-surface">Geçerlilik Süresi</label>
          <select 
            className="w-full border-slate-300 rounded-lg text-body-sm focus:border-indigo-600 focus:ring-indigo-600 bg-slate-50" 
            value={validityDays}
            onChange={(e) => setValidityDays(e.target.value)}
          >
            <option value="7 Gün">7 Gün</option>
            <option value="15 Gün">15 Gün</option>
            <option value="30 Gün">30 Gün</option>
            <option value="Özel">Özel</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);

const QuickSummary = () => (
  <div className="col-span-12 lg:col-span-4 bg-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
    <div className="relative z-10">
      <h3 className="text-title-lg mb-2">Hızlı Özet</h3>
      <p className="text-body-sm opacity-80 mb-6">Mevcut teklif detayları hemen yansıtılır. Kalemleri ekleyerek başlayın.</p>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-200">verified_user</span>
        <span className="text-label-sm">Otomatik Kayıt Aktif</span>
      </div>
    </div>
    <div className="absolute -right-10 -bottom-10 opacity-10">
      <span className="material-symbols-outlined" style={{ fontSize: '160px' }}>receipt_long</span>
    </div>
  </div>
);

type QuoteItem = {
  id: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  vatRate: number;
};

const ProductSelect = ({ item, updateItem, products }: { item: QuoteItem, updateItem: any, products: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(item.name || '');

  useEffect(() => {
    setSearchTerm(item.name || '');
  }, [item.name]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="flex items-center w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 transition-all">
        <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">inventory_2</span>
        <input 
          className="w-full border-none p-0 focus:ring-0 text-body-sm bg-transparent placeholder:text-slate-400" 
          placeholder="Ürün adı giriniz veya arayınız..." 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            updateItem(item.id, 'name', e.target.value);
            updateItem(item.id, 'product_id', undefined);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
        <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors ml-2 text-[20px]" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(p => (
              <div 
                key={p.id}
                className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault(); // Focus'un kaybolmasını engeller, anında seçimi tetikler
                  updateItem(item.id, 'product_id', p.id);
                  updateItem(item.id, 'name', p.name);
                  updateItem(item.id, 'price', p.sale_price || 0);
                  updateItem(item.id, 'vatRate', p.tax_rate || 20);
                  setSearchTerm(p.name);
                  setIsOpen(false);
                }}
              >
                <div className="text-body-sm font-medium text-slate-900">{p.name}</div>
                <div className="text-label-sm text-slate-400 mt-0.5">
                  Fiyat: ₺{p.sale_price} | KDV: %{p.tax_rate}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-body-sm text-slate-500 italic">
              Ürün bulunamadı. Yeni bir ürün ismi girdiniz.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const QuoteItemsTable = ({ items, updateItem, addItem, removeItem, products }: { items: QuoteItem[], updateItem: any, addItem: any, removeItem: any, products: any[] }) => (
  <div className="col-span-12 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
      <h3 className="text-title-lg text-slate-900">Teklif Kalemleri</h3>
      <button 
        onClick={addItem}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-label-md"
      >
        <span className="material-symbols-outlined">add_circle</span>
        Satır Ekle
      </button>
    </div>
    <div className="w-full">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider w-12 text-center">#</th>
            <th className="px-6 py-3 text-label-sm text-slate-500 uppercase tracking-wider">Ürün/Hizmet</th>
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
                  <ProductSelect item={item} updateItem={updateItem} products={products} />
                </td>
                <td className="px-6 py-4">
                  <input 
                    className="w-full border-slate-300 bg-slate-50 rounded-lg text-body-sm text-center focus:border-indigo-600 focus:ring-indigo-600" 
                    type="number" 
                    min="1"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value ? Number(e.target.value) : 0)}
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
                      value={item.price === 0 && !item.name ? '' : item.price}
                      onChange={(e) => updateItem(item.id, 'price', e.target.value ? Number(e.target.value) : 0)}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <select 
                    className="w-full border-slate-300 bg-slate-50 rounded-lg text-body-sm text-center focus:border-indigo-600 focus:ring-indigo-600"
                    value={item.vatRate}
                    onChange={(e) => updateItem(item.id, 'vatRate', Number(e.target.value))}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-900">
                  ₺ {total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className={`transition-colors ${items.length === 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'}`}
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
    <h4 className="font-label-md text-label-md text-slate-900 mb-4">Teklif Notları</h4>
    <textarea 
      className="w-full h-32 border-slate-200 rounded-lg text-body-sm focus:ring-indigo-600 focus:border-indigo-600 placeholder:text-slate-400" 
      placeholder="Örn: Ödeme teklif onayından sonra 7 iş günü içerisinde peşin olarak yapılacaktır."
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
    ></textarea>
  </div>
);

const QuoteTotals = ({ items }: { items: QuoteItem[] }) => {
  const { subtotal, totalVat, grandTotal } = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const vat = items.reduce((sum, item) => sum + (item.quantity * item.price * (item.vatRate / 100)), 0);
    return {
      subtotal: sub,
      totalVat: vat,
      grandTotal: sub + vat
    };
  }, [items]);

  return (
    <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <span className="text-body-sm text-slate-500">Ara Toplam</span>
        <span className="text-body-md font-semibold text-slate-900">
          ₺ {subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <span className="text-body-sm text-slate-500">Toplam KDV</span>
        <span className="text-body-md font-semibold text-slate-900">
          ₺ {totalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex justify-between items-center pt-2">
        <span className="text-title-lg text-slate-900">Genel Toplam</span>
        <span className="text-title-lg font-bold text-indigo-600">
          ₺ {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

const QuoteActions = ({ onSave, isLoading }: any) => (
  <div className="col-span-12 flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <button className="text-slate-500 hover:text-slate-900 text-label-md px-6 py-2.5 transition-colors">
      Vazgeç
    </button>
    <div className="flex gap-4 w-full md:w-auto">
      <button className="flex-1 md:flex-none border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-lg text-label-md transition-colors">
        Taslak Olarak Kaydet
      </button>
      <button 
        onClick={onSave}
        disabled={isLoading}
        className={`flex-1 md:flex-none ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-8 py-2.5 rounded-lg text-label-md flex items-center justify-center gap-2 transition-colors`}
      >
        {isLoading ? (
          <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">send</span>
        )}
        {isLoading ? 'Yükleniyor...' : 'Teklifi Kaydet ve Gönder'}
      </button>
    </div>
  </div>
);

export default function NewQuotePage() {
  const router = useRouter();

  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', product_id: undefined, name: '', quantity: 1, unit: 'Adet', price: 0, vatRate: 20 }
  ]);
  
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [contactId, setContactId] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState('15 Gün');
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchData() {
      const { data: contactsData } = await supabase.from('contacts').select('*').order('name');
      if (contactsData) setContacts(contactsData);
      
      const { data: productsData } = await supabase.from('products').select('*').order('name');
      if (productsData) setProducts(productsData);
    }
    fetchData();
  }, []);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), product_id: undefined, name: '', quantity: 1, unit: 'Adet', price: 0, vatRate: 20 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    console.log('Kayıt Edilmeye Çalışılan Kalemler (items state):', items);
    
    if (!contactId) {
      setErrorMsg('Lütfen bir müşteri seçiniz.');
      return;
    }
    
    // Check if any items have empty names
    if (items.some(item => !(item.name || '').trim())) {
      setErrorMsg('Lütfen tüm teklif kalemlerinin ürün adını giriniz.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Oturum açmış kullanıcı bulunamadı. Lütfen giriş yapın.');

      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const tax_total = items.reduce((sum, item) => sum + (item.quantity * item.price * (item.vatRate / 100)), 0);
      const total_amount = subtotal + tax_total;

      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const quote_number = `TEK-${timestamp}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const { data: quoteData, error: quoteError } = await supabase.from('quotes').insert({
        user_id: user.id,
        contact_id: contactId,
        quote_number,
        issue_date: issueDate,
        subtotal,
        tax_total,
        total_amount,
        notes,
        status: 'Pending'
      }).select().single();

      if (quoteError) throw quoteError;

      const itemsToInsert = items.map(item => ({
        quote_id: quoteData.id,
        product_id: item.product_id || null,
        quantity: item.quantity,
        unit_price: item.price,
        vat_rate: item.vatRate,
        line_total: item.quantity * item.price * (1 + item.vatRate / 100)
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);

      if (itemsError) throw itemsError;

      console.log("Kayıt Başarılı");
      setSuccessMsg('Teklif başarıyla kaydedildi! Yönlendiriliyorsunuz...');
      router.push('/quotes');

    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMsg(err.message || 'Teklif kaydedilirken beklenmeyen bir hata oluştu.');
    } finally {
      setIsLoading(false);
=======
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
>>>>>>> main
    }
  };

  return (
<<<<<<< HEAD
    <div className="p-margin-page min-h-screen text-on-background">
      <div className="max-w-container-max mx-auto space-y-stack-lg">
        <Breadcrumbs />
        
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
          />
          <QuickSummary />
          <QuoteItemsTable 
            items={items} 
            addItem={addItem} 
            removeItem={removeItem} 
            updateItem={updateItem} 
            products={products}
          />
          <QuoteNotes notes={notes} setNotes={setNotes} />
          <QuoteTotals items={items} />
          <QuoteActions onSave={handleSave} isLoading={isLoading} />
=======
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
>>>>>>> main
        </div>
      </div>
    </div>
  );
}
