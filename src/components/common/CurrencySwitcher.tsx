"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

/**
 * Sayfa üst başlığında kullanılan ortak "Görünüm: TRY/USD/EUR/GBP" seçici.
 * useCurrencyConverter hook'undaki viewCurrency/setViewCurrency'ye bağlanır.
 */
export default function CurrencySwitcher({
  value,
  onChange,
  label = "Görünüm:",
  className = "",
}: Props) {
  return (
    <div
      className={`flex items-center gap-2 bg-white border border-indigo-100 rounded-xl px-4 py-2 shadow-sm ${className}`}
    >
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none text-sm font-black text-primary outline-none focus:ring-0 cursor-pointer"
      >
        <option value="TRY">TRY (₺)</option>
        <option value="USD">USD ($)</option>
        <option value="EUR">EUR (€)</option>
        <option value="GBP">GBP (£)</option>
      </select>
    </div>
  );
}
