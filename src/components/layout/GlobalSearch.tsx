'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface SearchItem {
  title: string;
  path: string;
  category: string;
  stock?: number;
  sku?: string;
  isProduct?: boolean;
  isContact?: boolean;
  balance?: number;
}

// All navigable items in the system.
const SEARCH_ITEMS: SearchItem[] = [
  // 1. Gösterge Paneli / Ana Sayfa
  { title: 'Gösterge Paneli', path: '/dashboard', category: 'Ana Sayfa' },
  { title: 'Genel Bakış', path: '/dashboard', category: 'Ana Sayfa' },

  // 2. Stok
  { title: 'Stok', path: '/inventory', category: 'Stok' },
  { title: 'Stok Kontrol Paneli', path: '/inventory', category: 'Stok' },
  { title: 'Yeni Ürün Ekle', path: '/inventory/new', category: 'Stok' },

  // 3. Cari
  { title: 'Cari (Kişiler)', path: '/contacts', category: 'Cari' },
  { title: 'Cari Hesap Rehberi', path: '/contacts', category: 'Cari' },
  { title: 'Cari Hesap Ekle', path: '/contacts', category: 'Cari' },

  // 4. Teklifler
  { title: 'Teklifler', path: '/quotes', category: 'Teklifler' },
  { title: 'Teklifler (Alternatif)', path: '/proposals', category: 'Teklifler' },
  { title: 'Yeni Teklif Ekle', path: '/quotes/new', category: 'Teklifler' },
  { title: 'Yeni Teklif Ekle (Alternatif)', path: '/proposals/new', category: 'Teklifler' },

  // 5. Faturalar
  { title: 'Faturalar', path: '/invoices', category: 'Fatura' },
  { title: 'Yeni Fatura', path: '/invoices/new', category: 'Fatura' },
  { title: 'Yeni Fatura Ekle', path: '/invoices/new', category: 'Fatura' },

  // 6. Raporlar
  { title: 'Raporlar', path: '/reports', category: 'Raporlar' },
  { title: 'Genel Raporlar', path: '/reports', category: 'Raporlar' },
  { title: 'Gelir-Gider Raporu', path: '/reports/income-expense', category: 'Raporlar' },

  // 7. İşlem Geçmişi / Sistem
  { title: 'İşlem Geçmişi', path: '/activity-log', category: 'Sistem' },
  { title: 'Aktivite Günlüğü', path: '/activity-log', category: 'Sistem' },

  // 8. Çöp Kutusu
  { title: 'Çöp Kutusu', path: '/trash', category: 'Sistem' },

  // 9. Ayarlar
  { title: 'Ayarlar', path: '/settings/profile', category: 'Ayarlar' },
  { title: 'Profil Ayarları', path: '/settings/profile', category: 'Ayarlar' },
  { title: 'İşletme Ayarları', path: '/settings/business', category: 'Ayarlar' },
  { title: 'Kullanıcı Yönetimi', path: '/settings/users', category: 'Ayarlar' },
  { title: 'Kullanıcı Yönetimi (Ayarlar)', path: '/settings/users', category: 'Ayarlar' },
  { title: 'Rol Yönetimi', path: '/settings/users/roles', category: 'Ayarlar' },
  { title: 'Rol Yönetimi (Ayarlar)', path: '/settings/users/roles', category: 'Ayarlar' },
  { title: 'Üye Davet Et', path: '/settings/users/new', category: 'Ayarlar' },
  { title: 'Yeni Kullanıcı Ekle', path: '/settings/users/new', category: 'Ayarlar' },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Menü dışında tıklanırsa kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Giriş yapmış kullanıcının ID'sini al
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, []);

  // Veritabanından takım kapsamındaki ürünleri ve carileri çek
  const fetchSearchData = async () => {
    if (!userId) return;
    try {
      const { fetchTeamScopedData } = await import('@/app/(dashboard)/teamActions');
      
      // 1. Ürünleri çek (Takım Kapsamlı - Güvenli)
      const { data: prodData } = await fetchTeamScopedData(
        userId,
        'products',
        'id, name, sku, stock_quantity, categories(name)',
        { excludeDeleted: true }
      );
      if (prodData) {
        setProducts(prodData);
      }

      // 2. Carileri çek (Takım Kapsamlı - Güvenli)
      const { data: contactData } = await fetchTeamScopedData(
        userId,
        'contacts',
        'id, name, type, current_balance',
        { excludeDeleted: true }
      );
      if (contactData) {
        setContacts(contactData);
      }
    } catch (err) {
      console.error('Arama verileri yükleme hatası:', err);
    }
  };

  // Arama çubuğu açıldığında veya kullanıcı ID'si alındığında arama verilerini tazele
  useEffect(() => {
    if (userId && isOpen) {
      fetchSearchData();
    }
  }, [userId, isOpen]);

  // Girişe göre ürünleri filtrele (İsim, Barkod/SKU veya Kategori adı ile arama)
  const matchedProducts = products.filter((p) => {
    const q = query.toLocaleLowerCase('tr-TR').trim();
    if (!q) return false;

    const nameMatch = p.name?.toLocaleLowerCase('tr-TR').includes(q);
    const skuMatch = p.sku?.toLocaleLowerCase('tr-TR').includes(q);
    
    let categoryName = '';
    if (p.categories) {
      if (Array.isArray(p.categories)) {
        categoryName = p.categories[0]?.name || '';
      } else {
        categoryName = p.categories.name || '';
      }
    }
    const categoryMatch = categoryName.toLocaleLowerCase('tr-TR').includes(q);

    return nameMatch || skuMatch || categoryMatch;
  });

  const productItems: SearchItem[] = matchedProducts.map((p) => {
    let catName = 'Ürün';
    if (p.categories) {
      if (Array.isArray(p.categories)) {
        catName = p.categories[0]?.name || 'Ürün';
      } else {
        catName = p.categories.name || 'Ürün';
      }
    }
    return {
      title: p.name,
      path: `/inventory/${p.id}`,
      category: catName,
      stock: p.stock_quantity,
      sku: p.sku,
      isProduct: true,
    };
  });

  // Girişe göre carileri filtrele (İsim veya Tür ile arama)
  const matchedContacts = contacts.filter((c) => {
    const q = query.toLocaleLowerCase('tr-TR').trim();
    if (!q) return false;

    const nameMatch = c.name?.toLocaleLowerCase('tr-TR').includes(q);
    const typeMatch = c.type?.toLocaleLowerCase('tr-TR').includes(q);

    return nameMatch || typeMatch;
  });

  const contactItems: SearchItem[] = matchedContacts.map((c) => {
    return {
      title: c.name,
      path: `/contacts/${c.id}`,
      category: c.type || 'Cari Hesap',
      isContact: true,
      balance: c.current_balance,
    };
  });

  // Aramaya göre filtrele ve alfabetik (Türkçe kurallarına göre) sırala
  const staticFiltered = SEARCH_ITEMS.filter((item) => {
    const searchStr = `${item.title} ${item.category}`.toLocaleLowerCase('tr-TR');
    return searchStr.includes(query.toLocaleLowerCase('tr-TR'));
  }).sort((a, b) => a.title.localeCompare(b.title, 'tr-TR'));

  const allFiltered = [...staticFiltered, ...productItems, ...contactItems];

  // Arama metni değiştiğinde aktif indeksi sıfırla
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Klavye olayları (Yön tuşları ve Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < allFiltered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allFiltered.length > 0 && allFiltered[activeIndex]) {
        handleSelect(allFiltered[activeIndex].path);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (path: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(path);
  };

  return (
    <div className="relative w-80" ref={wrapperRef}>
      <input
        type="text"
        placeholder="Ürün, cari, ayar veya sayfa ara..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 pl-10 rounded-full bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all animate-all duration-300"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">
        search
      </span>

      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {allFiltered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              "{query}" için sonuç bulunamadı.
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {allFiltered.map((item, index) => (
                <li key={`${item.path}-${item.title}-${index}`}>
                  <button
                    onClick={() => handleSelect(item.path)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-colors text-left ${
                      activeIndex === index
                        ? 'bg-indigo-50/80 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.isProduct ? (
                      <div className="w-full flex items-center justify-between">
                        <div className="flex flex-col items-start min-w-0 pr-2">
                          <span className={`font-semibold truncate w-full ${
                            activeIndex === index ? 'text-indigo-900' : 'text-slate-800'
                          }`}>
                            {item.title}
                          </span>
                          <span className={`text-[10px] font-mono mt-0.5 ${
                            activeIndex === index ? 'text-indigo-400' : 'text-slate-400'
                          }`}>
                            SKU: {item.sku}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            item.stock !== undefined && item.stock <= 5 
                              ? 'bg-amber-50/70 text-amber-600 border-amber-100' 
                              : 'bg-emerald-50/70 text-emerald-600 border-emerald-100'
                          }`}>
                            Stok: {item.stock} Adet
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded transition-colors ${
                            activeIndex === index 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                      </div>
                    ) : item.isContact ? (
                      <div className="w-full flex items-center justify-between">
                        <div className="flex flex-col items-start min-w-0 pr-2">
                          <span className={`font-semibold truncate w-full ${
                            activeIndex === index ? 'text-indigo-900' : 'text-slate-800'
                          }`}>
                            {item.title}
                          </span>
                          <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wide ${
                            activeIndex === index ? 'text-indigo-400' : 'text-slate-400'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.balance !== undefined && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              item.balance > 0 
                                ? 'bg-emerald-50/70 text-emerald-600 border-emerald-100' 
                                : item.balance < 0 
                                  ? 'bg-rose-50/70 text-rose-600 border-rose-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                            }`}>
                              {item.balance > 0 ? '+' : ''}{item.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="font-semibold truncate w-full">{item.title}</span>
                          <span
                            className={`text-[10px] font-bold mt-0.5 uppercase tracking-wide ${
                              activeIndex === index ? 'text-indigo-400' : 'text-slate-400'
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity">
                          chevron_right
                        </span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

