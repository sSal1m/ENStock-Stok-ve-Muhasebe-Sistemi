import { useState, useEffect, useCallback } from "react";

/**
 * useCurrencyConverter Hook
 * TCMB kurlarını çeker ve para birimi dönüştürme/formatlama işlemlerini merkezileştirir.
 */
export function useCurrencyConverter(initialCurrency = "TRY") {
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewCurrency, setViewCurrency] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("preferred_currency") || initialCurrency;
    }
    return initialCurrency;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_currency", viewCurrency);
    }
  }, [viewCurrency]);


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
