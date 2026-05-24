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

/**
 * Mevcut oturum sahibinin varsayılan para birimi.
 */
export async function fetchMyDefaultCurrency(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return FALLBACK_CURRENCY;
    return fetchDefaultCurrency(user.id);
  } catch {
    return FALLBACK_CURRENCY;
  }
}
