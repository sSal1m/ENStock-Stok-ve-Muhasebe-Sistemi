import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMyDefaultCurrency } from "@/lib/defaultCurrency";

const PREFERRED_KEY = "preferred_currency";
const OVERRIDE_FLAG_KEY = "preferred_currency_overridden";

/**
 * useCurrencyConverter Hook
 *
 * Initial currency önceliği:
 *   1) localStorage (kullanıcı sayfa bazlı override yapmışsa F5 sonrası bile korunur)
 *   2) profiles.default_currency (İşletme → Finansal Yapılandırma'daki seçim)
 *   3) "TRY" fallback
 *
 * Kullanıcı `setViewCurrency` ile bir değer seçerse "override yapıldı" işareti
 * konur; bu sayede DB'deki işletme default'u sonradan değişse bile o sayfadaki
 * override silinmez.
 */
export function useCurrencyConverter(initialCurrency = "TRY") {
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewCurrency, setViewCurrencyState] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PREFERRED_KEY);
      if (stored) return stored;
    }
    return initialCurrency;
  });
  const userOverrodeRef = useRef<boolean>(
    typeof window !== "undefined" && localStorage.getItem(OVERRIDE_FLAG_KEY) === "1"
  );

  // İşletmenin DB'deki varsayılan para birimini bir kez çek; kullanıcı henüz
  // sayfa bazlı bir override yapmadıysa initial değeri buna eşitle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dbDefault = await fetchMyDefaultCurrency();
      if (cancelled) return;
      if (!userOverrodeRef.current) {
        setViewCurrencyState(dbDefault);
        if (typeof window !== "undefined") {
          localStorage.setItem(PREFERRED_KEY, dbDefault);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setViewCurrency = useCallback((value: string) => {
    userOverrodeRef.current = true;
    if (typeof window !== "undefined") {
      localStorage.setItem(PREFERRED_KEY, value);
      localStorage.setItem(OVERRIDE_FLAG_KEY, "1");
    }
    setViewCurrencyState(value);
  }, []);

  useEffect(() => {
    async function fetchRates() {
      try {
        setLoading(true);
        const res = await fetch("/api/currency");
        const data = await res.json();
        if (data.rates) {
          setRates(data.rates);
        }
      } catch (err) {
        console.error("Kur çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, []);

  /**
   * TL değerini hedef para birimine çevirir.
   * Eğer hedef belirtilmezse mevcut 'viewCurrency' kullanılır.
   */
  const convert = useCallback(
    (amount: number | null | undefined, to: string = viewCurrency) => {
      const parsedAmount = Number(amount) || 0;
      if (!rates || to === "TRY") return parsedAmount;
      const rate = rates[to]?.selling || 1;
      return parsedAmount / rate;
    },
    [rates, viewCurrency]
  );

  /**
   * Herhangi bir birimden başka bir birime çevirme yapar (Full Converter)
   */
  const convertFull = useCallback(
    (amount: number | null | undefined, from: string, to: string) => {
      const parsedAmount = Number(amount) || 0;
      if (!rates) return parsedAmount;

      // Önce her şeyi TRY'ye çevir
      let amountInTry = parsedAmount;
      if (from !== "TRY") {
        amountInTry = parsedAmount * (rates[from]?.selling || 1);
      }

      // Sonra TRY'den hedefe çevir
      if (to === "TRY") return amountInTry;
      return amountInTry / (rates[to]?.selling || 1);
    },
    [rates]
  );

  /**
   * Para birimini sembolüyle ve binlik ayracıyla formatlar.
   */
  const format = useCallback(
    (amount: number | null | undefined, currency: string = viewCurrency) => {
      const symbols: Record<string, string> = {
        TRY: "₺",
        USD: "$",
        EUR: "€",
        GBP: "£",
      };
      const symbol = symbols[currency] || (currency === "TRY" ? "₺" : currency);

      const parsedAmount = Number(amount) || 0;

      return (
        symbol +
        parsedAmount.toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    },
    [viewCurrency]
  );

  return {
    rates,
    loading,
    viewCurrency,
    setViewCurrency,
    convert,
    convertFull,
    format,
  };
}
