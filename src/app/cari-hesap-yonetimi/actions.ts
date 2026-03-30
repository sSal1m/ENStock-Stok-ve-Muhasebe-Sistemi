"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/* ═══════════════════════════════════════════
   Server-side Supabase client (uses Service Role Key)
   — never exposed to the browser
   ═══════════════════════════════════════════ */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

/* ═══════════════════════════════════════════
   Server Action — Yeni Cari Ekle (INSERT)
   ═══════════════════════════════════════════ */

export interface CariFormState {
  success: boolean;
  message: string;
}

export async function cariEkleAction(formData: FormData): Promise<CariFormState> {
  const tip = formData.get("tip") as string;
  const unvan = (formData.get("unvan") as string)?.trim();
  const vergiNo = (formData.get("vergi_no") as string)?.trim();
  const vergiDairesi = (formData.get("vergi_dairesi") as string)?.trim();
  const telefon = (formData.get("telefon") as string)?.trim();
  const adres = (formData.get("adres") as string)?.trim();

  // Validation
  if (!unvan || unvan.length < 2) {
    return { success: false, message: "Firma/Şahıs adı en az 2 karakter olmalıdır." };
  }

  // Generate initials (kisaltma)
  const words = unvan.split(/\s+/);
  const kisaltma =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : unvan.slice(0, 2).toUpperCase();

  try {
    const { error } = await supabaseServer.from("cariler").insert([
      {
        tip: tip || "Müşteri",
        unvan,
        kisaltma,
        vergi_no: vergiNo || null,
        vergi_dairesi: vergiDairesi || null,
        telefon: telefon || null,
        eposta: null,
        sehir: null,
        adres: adres || null,
        bakiye: 0,
      },
    ]);

    if (error) {
      console.error("Supabase INSERT hatası:", error);
      return { success: false, message: `Veritabanı hatası: ${error.message}` };
    }

    // Revalidate so the list refreshes
    revalidatePath("/cari-hesap-yonetimi");

    return { success: true, message: `"${unvan}" başarıyla eklendi!` };
  } catch (err) {
    console.error("Beklenmeyen hata:", err);
    return { success: false, message: "Beklenmeyen bir sunucu hatası oluştu." };
  }
}
