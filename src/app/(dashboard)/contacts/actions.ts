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
   Server Action — Yeni Kişi/Cari Ekle (INSERT)
   ═══════════════════════════════════════════ */

export interface CariFormState {
  success: boolean;
  message: string;
}

export async function cariEkleAction(formData: FormData): Promise<CariFormState> {
  const tip = (formData.get("tip") as string)?.trim();
  const unvan = (formData.get("unvan") as string)?.trim();
  const vergiNo = (formData.get("vergi_no") as string)?.trim();
  const vergiDairesi = (formData.get("vergi_dairesi") as string)?.trim();
  const telefon = (formData.get("telefon") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const adres = (formData.get("adres") as string)?.trim();

  // Validation
  if (!unvan || unvan.length < 2) {
    return { success: false, message: "Firma/Şahıs adı en az 2 karakter olmalıdır." };
  }

  // Enum Mapping - support both Turkish and English names
  const type = (tip === "Tedarikçi" || tip === "supplier") ? "supplier" : "customer";

  try {
    // ✅ Kullanıcının ID'sini FormData üzerinden al
    const userId = formData.get("user_id") as string;
    
    if (!userId) {
      return { success: false, message: "Kullanıcı doğrulaması başarısız. Lütfen tekrar giriş yapın." };
    }

    const { error } = await supabaseServer.from("contacts").insert([
      {
        type,
        name: unvan,
        tax_number: vergiNo || null,
        tax_office: vergiDairesi || null,
        phone: telefon || null,
        email: email || null,
        address: adres || null,
        current_balance: 0,
        user_id: userId
      },
    ]);

    if (error) {
      console.error("Supabase INSERT hatası:", error);
      return { success: false, message: `Kayıt hatası: ${error.message} (Detay: ${error.details || error.hint})` };
    }

    // Revalidate so the list refreshes
    revalidatePath("/contacts");

    return { success: true, message: `"${unvan}" başarıyla eklendi!` };
  } catch (err) {
    console.error("Beklenmeyen hata:", err);
    return { success: false, message: "Beklenmeyen bir sunucu hatası oluştu." };
  }
}
