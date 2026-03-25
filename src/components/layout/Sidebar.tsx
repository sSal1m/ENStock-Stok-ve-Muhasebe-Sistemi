export default function Sidebar() {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 rounded-r-lg bg-slate-50 flex flex-col p-4 gap-2 bg-indigo-50/30 text-sm font-semibold hidden md:flex">
      {/* Logo & Başlık */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            inventory_2
          </span>
        </div>
        <div>
          <h2 className="text-lg font-black text-indigo-700 leading-tight">KOBİ Ekosistemi</h2>
          <p className="text-xs font-medium text-slate-500">Yönetici Paneli</p>
        </div>
      </div>

      {/* Navigasyon Menüsü */}
      <nav className="flex-1 space-y-1">
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-transform duration-200 hover:translate-x-1"
          href="/dashboard"
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span>Panel</span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-transform duration-200 hover:translate-x-1"
          href="/invoices"
        >
          <span className="material-symbols-outlined">receipt_long</span>
          <span>Satışlar</span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-lg shadow-indigo-200 transition-transform duration-200 hover:translate-x-1"
          href="/inventory"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            inventory_2
          </span>
          <span>Stok Yönetimi</span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-transform duration-200 hover:translate-x-1"
          href="#"
        >
          <span className="material-symbols-outlined">payments</span>
          <span>Giderler</span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-transform duration-200 hover:translate-x-1"
          href="/contacts"
        >
          <span className="material-symbols-outlined">group</span>
          <span>Cari Hesaplar</span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-transform duration-200 hover:translate-x-1"
          href="#"
        >
          <span className="material-symbols-outlined">account_balance</span>
          <span>Banka</span>
        </a>
      </nav>

      {/* Alt Bölüm */}
      <div className="mt-auto pt-4 border-t border-indigo-50">
        <button className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-100 py-2.5 rounded-lg mb-4 hover:bg-indigo-50 transition-colors">
          <span className="material-symbols-outlined text-sm">support_agent</span>
          <span>Destek Talebi</span>
        </button>
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg"
          href="#"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Çıkış Yap</span>
        </a>
      </div>
    </aside>
  );
}
