import { XMLParser } from 'fast-xml-parser';

export interface ExchangeRate {
  code: string;
  name: string;
  buying: number;
  selling: number;
}

export interface RatesResponse {
  date: string;
  rates: Record<string, ExchangeRate>;
}

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

/**
 * TCMB'den güncel kurları çeker ve JSON formatına çevirir.
 * Sunucu tarafında (Server Actions veya Server Components) kullanılmalıdır.
 */
export async function getTCMBRates(): Promise<RatesResponse | null> {
  try {
    // Next.js caching: revalidate once every 24 hours (86400 seconds)
    const response = await fetch(TCMB_URL, {
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      throw new Error('TCMB servisinden yanıt alınamadı.');
    }

    const xmlData = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });

    const jsonObj = parser.parse(xmlData);
    
    // TCMB XML yapısı: Tarih_Date -> Currency[]
    const date = jsonObj.Tarih_Date?.['@_Tarih'] || new Date().toISOString();
    const currencies = jsonObj.Tarih_Date?.Currency;

    if (!currencies || !Array.isArray(currencies)) {
      return null;
    }

    const rates: Record<string, ExchangeRate> = {
      'TRY': { code: 'TRY', name: 'Türk Lirası', buying: 1, selling: 1 }
    };

    currencies.forEach((curr: any) => {
      const code = curr['@_CurrencyCode'];
      if (code) {
        rates[code] = {
          code,
          name: curr.Isim || curr.CurrencyName,
          buying: parseFloat(curr.ForexBuying) || 0,
          selling: parseFloat(curr.ForexSelling) || 0
        };
      }
    });

    return {
      date,
      rates
    };
  } catch (error) {
    console.error('Döviz kuru çekme hatası:', error);
    return null;
  }
}

/**
 * Belirli bir tutarı bir dövizden diğerine çevirir.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, ExchangeRate>
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) return 0;

  // Önce TRY'ye çevir, sonra hedef dövize
  const amountInTRY = amount * fromRate.selling;
  return amountInTRY / toRate.selling;
}
