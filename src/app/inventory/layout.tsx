import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

export default function InventoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-surface text-on-surface">
      <Sidebar />
      <main className="md:ml-64 min-h-screen">
        <Navbar />
        {children}
      </main>

      {/* Mobil Alt Navigasyon */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex justify-around items-center h-16 px-2 z-50">
        <a className="flex flex-col items-center justify-center text-slate-400" href="/dashboard">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold">Panel</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-400" href="/invoices">
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="text-[10px] font-bold">Satış</span>
        </a>
        <div className="relative -top-6">
          <button className="w-14 h-14 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-200 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
        <a className="flex flex-col items-center justify-center text-indigo-700" href="/inventory">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            inventory_2
          </span>
          <span className="text-[10px] font-bold">Stok</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-400" href="/contacts">
          <span className="material-symbols-outlined">group</span>
          <span className="text-[10px] font-bold">Cari</span>
        </a>
      </nav>
    </div>
  );
}
