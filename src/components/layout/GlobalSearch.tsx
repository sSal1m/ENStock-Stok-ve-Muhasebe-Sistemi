'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchItem {
  title: string;
  path: string;
  category: string;
}

// All navigable items in the system.
const SEARCH_ITEMS: SearchItem[] = [
  { title: 'Cari Hesap Rehberi', path: '/contacts', category: 'Cari' },
  { title: 'Cari Hesap Ekle', path: '/contacts/new', category: 'Cari' },
  { title: 'Çöp Kutusu', path: '/trash', category: 'Sistem' },
  { title: 'Faturalar', path: '/invoices', category: 'Fatura' },
  { title: 'Gelir-Gider Raporu', path: '/reports/income-expense', category: 'Raporlar' },
  { title: 'Genel Bakış', path: '/dashboard', category: 'Ana Sayfa' },
  { title: 'Genel Raporlar', path: '/reports', category: 'Raporlar' },
  { title: 'Hesap Ayarları', path: '/settings', category: 'Ayarlar' },
  { title: 'İşletme Ayarları', path: '/settings/business', category: 'Ayarlar' },
  { title: 'Kullanıcı Yönetimi', path: '/users', category: 'Kullanıcılar' },
  { title: 'Kullanıcı Yönetimi (Ayarlar)', path: '/settings/users', category: 'Ayarlar' },
  { title: 'Profil Ayarları', path: '/settings/profile', category: 'Ayarlar' },
  { title: 'Rol Yönetimi', path: '/users/roles', category: 'Kullanıcılar' },
  { title: 'Rol Yönetimi (Ayarlar)', path: '/settings/users/roles', category: 'Ayarlar' },
  { title: 'Satış Yönetimi', path: '/sales', category: 'Satış' },
  { title: 'Stok Kontrol Paneli', path: '/inventory', category: 'Stok' },
  { title: 'Üye Davet Et', path: '/settings/users/new', category: 'Ayarlar' },
  { title: 'Yeni Fatura', path: '/invoices/new', category: 'Fatura' },
  { title: 'Yeni Kullanıcı Ekle', path: '/users/new', category: 'Kullanıcılar' },
  { title: 'Yeni Ürün Ekle', path: '/inventory/new', category: 'Stok' },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
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

  // Aramaya göre filtrele ve alfabetik (Türkçe kurallarına göre) sırala
  const filteredItems = SEARCH_ITEMS.filter((item) => {
    const searchStr = `${item.title} ${item.category}`.toLocaleLowerCase('tr-TR');
    return searchStr.includes(query.toLocaleLowerCase('tr-TR'));
  }).sort((a, b) => a.title.localeCompare(b.title, 'tr-TR'));

  // Arama metni değiştiğinde aktif indeksi sıfırla
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Klavye olayları (Yön tuşları ve Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems.length > 0 && filteredItems[activeIndex]) {
        handleSelect(filteredItems[activeIndex].path);
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
        placeholder="Ayarlar, roller, sayfalar ara..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 pl-10 rounded-full bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">
        search
      </span>

      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              "{query}" için sonuç bulunamadı.
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {filteredItems.map((item, index) => (
                <li key={item.path}>
                  <button
                    onClick={() => handleSelect(item.path)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full flex flex-col items-start px-4 py-2 rounded-lg text-sm transition-colors ${
                      activeIndex === index
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium">{item.title}</span>
                    <span
                      className={`text-xs mt-0.5 ${
                        activeIndex === index ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    >
                      {item.category}
                    </span>
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
