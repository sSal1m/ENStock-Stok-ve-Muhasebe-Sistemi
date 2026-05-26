import { supabase } from "@/lib/supabaseClient";

const FALLBACK_CURRENCY = "TRY";

/**
 * İşletmenin "Finansal Yapılandırma"da seçtiği varsayılan para birimini
 * `profiles.default_currency` kolonundan okur.
 *
 * Hata veya değer yoksa "TRY" döner. Asla throw etmez — UI bunu init
 * sırasında kullanır ve fallback'e güvenir.
 */
export async function fetchDefaultCurrency(userId: string): Promise<string> {
  if (!userId) return FALLBACK_CURRENCY;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data?.default_currency) return FALLBACK_CURRENCY;
    return data.default_currency;
  } catch {
    return FALLBACK_CURRENCY;
  }
}

const DEFAULT_CURRENCY_CACHE_KEY = "cached_default_currency";

/**
 * Mevcut oturum sahibinin varsayılan para birimi.
 */
export async function fetchMyDefaultCurrency(): Promise<string> {
  try {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(DEFAULT_CURRENCY_CACHE_KEY);
      if (cached) return cached;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return FALLBACK_CURRENCY;
    const currency = await fetchDefaultCurrency(user.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DEFAULT_CURRENCY_CACHE_KEY, currency);
    }
    return currency;
  } catch {
    return FALLBACK_CURRENCY;
  }
}
