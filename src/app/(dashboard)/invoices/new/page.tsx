"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

// ─── Tipler ────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  currency: string;
  sale_price_in_currency: number;
}

interface InvoiceItem {
  id: string; // generate local id for UI
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

// ─── Bileşen ────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();

  // Veri Durumları
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form Durumları
  const [contactId, setContactId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState("TRY");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // ── Kullanıcı ID'sini Al ────────────────────────────────────────────────
  useEffect(() => {
    async function getUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast.error("Kullanıcı oturum açmamış.");
        return;
      }
      setUserId(user.id);
    }
    getUser();
  }, []);

  // ── Verileri Çek ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    async function fetchData() {
      try {
        const [contactsRes, productsRes, ratesRes] = await Promise.all([
          supabase.from("contacts").select("id, name, type").eq("user_id", userId).order("name"),
          supabase.from("products").select("id, name, sku, sale_price, currency, sale_price_in_currency").eq("user_id", userId).order("name"),
          fetch("/api/currency").then(res => res.json())
        ]);

        if (contactsRes.data) setContacts(contactsRes.data);
        if (productsRes.data) setProducts(productsRes.data);
        if (ratesRes.rates) setRates(ratesRes.rates);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  // ── Hesaplamalar ─────────────────────────────────────────────────────────
  const { subtotal, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      sub += lineTotal;
      tax += lineTotal * (item.tax_rate / 100);
    });
    return {
      subtotal: sub,
      taxTotal: tax,
      grandTotal: sub + tax
    };
  }, [items]);

  // ── Aksiyonlar ───────────────────────────────────────────────────────────
  const addItem = (product: Product) => {
    // Ürünün fiyatını fatura dövizine çevir
    let price = product.sale_price;
    if (product.currency !== currency && rates) {
       // Ürünün TRY fiyatı `product.sale_price` (zaten TRY olarak kaydediliyor modified save logic'te)
       // Fatura dövizi TRY değilse, TRY fiyatını fatura dövizine böl
       if (currency !== "TRY") {
          const targetRate = rates[currency]?.selling || 1;
          price = product.sale_price / targetRate;
       }
    } else if (product.currency === currency) {
      price = product.sale_price_in_currency || product.sale_price;
    }

    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: product.id,
      name: product.name,
      quantity: 1,
      unit_price: price,
      tax_rate: 20
    };
    setItems(prev => [...prev, newItem]);
    toast.success(`${product.name} eklendi`);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !contactId || items.length === 0) {
      toast.error("Lütfen gerekli alanları doldurun ve en az bir ürün ekleyin.");
      return;
    }

    setSaving(true);
    try {
      const currentRate = currency === "TRY" ? 1 : rates[currency]?.selling || 1;

      const invoicePayload = {
        user_id: userId,
        contact_id: contactId,
        invoice_no: invoiceNo,
        issue_date: issueDate,
        currency: currency,
        exchange_rate: currentRate,
        subtotal: subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        status: "pending",
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from("invoices").insert(invoicePayload).select();

      if (error) throw error;

      // TODO: Add invoice items save logic if you have an invoice_items table
      
      toast.success("Fatura başarıyla oluşturuldu!");
      router.push("/invoices");
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (val: number) => {
    return val.toLocaleString("tr-TR", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + " " + currency;
  };

  if (loading) {
    return <div className="p-10 text-center animate-pulse text-primary font-bold">Yükleniyor...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-on-surface tracking-tight">Yeni Satış Faturası</h1>
            <p className="text-slate-500 text-sm">Resmi satış faturası düzenleyin.</p>
          </div>
          <button 
            onClick={() => router.push("/invoices")}
            className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2 font-bold"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Listeye Dön
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
          
          {/* Sol Panel: Fatura Bilgileri */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* Üst Bilgiler */}
            <div className="bg-white p-6 rounded-2xl border border-indigo-50 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Müşteri Seçin</label>
                <select 
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                >
                  <option value="">Müşteri Seçiniz</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type === 'customer' ? 'Müşteri' : 'Tedarikçi'})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Fatura No</label>
                  <input 
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Döviz</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Kalemler */}
            <div className="bg-white rounded-2xl border border-indigo-50 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/50 border-b border-indigo-50 flex justify-between items-center px-6">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fatura Kalemleri</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-indigo-100">
                      <th className="px-6 py-4">Ürün Bilgisi</th>
                      <th className="px-4 py-4 w-24">Adet</th>
                      <th className="px-4 py-4 w-32 text-right">Birim Fiyat</th>
                      <th className="px-4 py-4 w-20 text-right">KDV</th>
                      <th className="px-4 py-4 w-32 text-right">Toplam</th>
                      <th className="px-6 py-4 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-300 italic text-sm">
                          Henüz bir ürün eklenmedi. Sağ tarafadaki listeden ürün seçin.
                        </td>
                      </tr>
                    ) : (
                      items.map(item => (
                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-on-surface">{item.name}</p>
                          </td>
                          <td className="px-4 py-4">
                            <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-full bg-slate-100 border-none rounded-lg px-2 py-1.5 text-sm outline-none"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input 
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                              className="w-full bg-slate-100 border-none rounded-lg px-2 py-1.5 text-sm text-right font-mono outline-none"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <select 
                              value={item.tax_rate}
                              onChange={(e) => updateItem(item.id, 'tax_rate', Number(e.target.value))}
                              className="bg-transparent border-none text-[10px] font-bold text-slate-500 outline-none"
                            >
                              <option value="1">%1</option>
                              <option value="10">%10</option>
                              <option value="20">%20</option>
                            </select>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="text-sm font-black text-on-surface tabular-nums">
                              {fmt(item.quantity * item.unit_price)}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 text-slate-300 hover:text-error transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sağ Panel: Ürün Seçici ve Toplamlar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* Ürün Arama/Seçme */}
            <div className="bg-white p-6 rounded-2xl border border-indigo-50 shadow-sm">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ürün Ekle</label>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {products.map(p => (
                  <button 
                    key={p.id}
                    type="button"
                    onClick={() => addItem(p)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group text-left"
                  >
                    <div>
                      <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">add_circle</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Özet ve Kaydet */}
            <div className="bg-primary text-white p-6 rounded-3xl shadow-xl shadow-primary/20 space-y-6">
              <h3 className="text-lg font-black uppercase tracking-widest opacity-80">Fatura Özeti</h3>
              
              <div className="space-y-3 border-b border-white/10 pb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-70">Ara Toplam:</span>
                  <span className="font-bold tabular-nums">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-70">KDV Toplam:</span>
                  <span className="font-bold tabular-nums">{fmt(taxTotal)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <span className="text-sm font-bold uppercase tracking-widest opacity-70">Genel Toplam:</span>
                <span className="text-3xl font-black tabular-nums leading-none">{fmt(grandTotal)}</span>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-white text-primary font-black py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">send</span>
                      Faturayı Oluştur
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        <footer className="pt-12 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">
          © 2026 KOBİ Muhasebe · Güvenli Altyapı
        </footer>
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}
