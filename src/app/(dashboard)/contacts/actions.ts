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
  data?: {
    id: string;
    type: "customer" | "supplier";
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    current_balance: number;
  };
}

export async function cariEkleAction(formData: FormData): Promise<CariFormState> {
  const tip = (formData.get("tip") as string)?.trim();
  const unvan = (formData.get("unvan") as string)?.trim();
  const vergiNo = (formData.get("vergi_no") as string)?.trim();
  const vergiDairesi = (formData.get("vergi_dairesi") as string)?.trim();
  const telefon = (formData.get("telefon") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const adres = (formData.get("adres") as string)?.trim();
  const userId = (formData.get("user_id") as string)?.trim();

  // Validation
  if (!unvan || unvan.length < 2) {
    return { success: false, message: "Firma/Şahıs adı en az 2 karakter olmalıdır." };
  }

  if (!userId) {
    return { success: false, message: "Kullanıcı doğrulaması başarısız. Lütfen giriş yapın." };
  }

  // Enum Mapping - support both Turkish and English names
  const type = (tip === "Tedarikçi" || tip === "supplier") ? "supplier" : "customer";

  try {
    const { data: newContact, error } = await supabaseServer
      .from("contacts")
      .insert([
        {
          type,
          name: unvan,
          tax_number: vergiNo || null,
          tax_office: vergiDairesi || null,
          phone: telefon || null,
          email: email || null,
          address: adres || null,
          current_balance: 0,
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase INSERT hatası:", error);
      return { success: false, message: `Kayıt hatası: ${error.message}` };
    }

    revalidatePath("/contacts");

    return { 
      success: true, 
      message: `"${unvan}" başarıyla eklendi!`,
      data: newContact && {
        id: newContact.id,
        type: newContact.type,
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        address: newContact.address,
        current_balance: newContact.current_balance,
      }
    };
  } catch (err) {
    console.error("Beklenmeyen hata:", err);
    return { success: false, message: "Beklenmeyen bir sunucu hatası oluştu." };
  }
}
