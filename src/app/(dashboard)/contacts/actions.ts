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
  const tipInput = formData.get("tip") as string;
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

  // Enum Mapping
  const type = tipInput === "Müşteri" ? "customer" : "supplier";

  try {
    // ✅ Kullanıcı ID'sini alma (Server-side)
    // NOT: Gerçek bir uygulamada Next.js auth-helpers veya SSR paketi kullanılır.
    // Mevcut kısıtlı yapıda o anki kullanıcıyı listUsers içinden çekiyoruz (Örnek amaçlı ilk kullanıcı).
    const { data: authData, error: authError } = await supabaseServer.auth.admin.listUsers();
    const userId = authData?.users?.[0]?.id || null;

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
        user_id: userId, // 👈 Veritabanı mapping kuralı: user_id setleniyor
      },
    ]);

    if (error) {
      console.error("Supabase INSERT hatası:", error);
      return { success: false, message: `Veritabanı hatası: ${error.message}` };
    }

    // Revalidate so the list refreshes
    revalidatePath("/contacts");

    return { success: true, message: `"${unvan}" başarıyla eklendi!` };
  } catch (err) {
    console.error("Beklenmeyen hata:", err);
    return { success: false, message: "Beklenmeyen bir sunucu hatası oluştu." };
  }
}
