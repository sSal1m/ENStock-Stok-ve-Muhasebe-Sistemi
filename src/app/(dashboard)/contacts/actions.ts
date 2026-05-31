"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activityLogger";
import { checkPermission } from "@/lib/authHelpers";

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
  const hasAccess = await checkPermission("contacts", "can_create");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

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

    if (newContact) {
      await logActivity({
        userId,
        module: "contact",
        action: "create",
        entityId: newContact.id,
        entityName: newContact.name,
        description: `"${newContact.name}" ${type === "customer" ? "müşterisi" : "tedarikçisi"} oluşturuldu`,
        metadata: {
          type,
          tax_number: vergiNo || null,
          phone: telefon || null,
          email: email || null,
        },
      });
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

export async function cariGuncelleAction(formData: FormData): Promise<CariFormState> {
  const hasAccess = await checkPermission("contacts", "can_edit");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  const id = (formData.get("id") as string)?.trim();
  const tip = (formData.get("tip") as string)?.trim();
  const unvan = (formData.get("unvan") as string)?.trim();
  const vergiNo = (formData.get("vergi_no") as string)?.trim();
  const vergiDairesi = (formData.get("vergi_dairesi") as string)?.trim();
  const telefon = (formData.get("telefon") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const adres = (formData.get("adres") as string)?.trim();
  const userId = (formData.get("user_id") as string)?.trim();

  // Validation
  if (!id) return { success: false, message: "Cari ID bulunamadı." };
  if (!unvan || unvan.length < 2) return { success: false, message: "Firma/Şahıs adı en az 2 karakter olmalıdır." };
  if (!userId) return { success: false, message: "Kullanıcı doğrulaması başarısız. Lütfen giriş yapın." };

  const type = (tip === "Tedarikçi" || tip === "supplier") ? "supplier" : "customer";

  try {
    const { data: updatedContact, error } = await supabaseServer
      .from("contacts")
      .update({
        type,
        name: unvan,
        tax_number: vergiNo || null,
        tax_office: vergiDairesi || null,
        phone: telefon || null,
        email: email || null,
        address: adres || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase UPDATE hatası:", error);
      return { success: false, message: `Güncelleme hatası: ${error.message}` };
    }

    await logActivity({
      userId,
      module: "contact",
      action: "update",
      entityId: id,
      entityName: unvan,
      description: `"${unvan}" cari bilgileri güncellendi`,
      metadata: {
        type,
        tax_number: vergiNo || null,
        phone: telefon || null,
        email: email || null,
      },
    });

    revalidatePath(`/contacts/${id}`);
    revalidatePath("/contacts");

    return {
      success: true,
      message: `"${unvan}" başarıyla güncellendi!`,
      data: updatedContact
    };
  } catch (err) {
    console.error("Beklenmeyen hata:", err);
    return { success: false, message: "Beklenmeyen bir sunucu hatası oluştu." };
  }
}

export async function islemYapAction(formData: FormData) {
  const hasAccess = await checkPermission("invoices", "can_create");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  const cariId = (formData.get("cari_id") as string)?.trim();
  const islemTuru = (formData.get("islem_turu") as string)?.trim(); // "Tahsilat" | "Ödeme"
  const tutarStr = (formData.get("tutar") as string)?.trim();
  const notlar = (formData.get("notlar") as string)?.trim();
  const userId = (formData.get("user_id") as string)?.trim();
  const invoiceId = (formData.get("invoice_id") as string)?.trim();
  
  if (!cariId || !islemTuru || !tutarStr || !userId) {
    return { success: false, message: "Eksik bilgi girdiniz." };
  }

  const tutar = parseFloat(tutarStr);
  if (isNaN(tutar) || tutar <= 0) {
    return { success: false, message: "Geçerli bir tutar giriniz." };
  }

  try {
    // 1️⃣ GET CURRENT BALANCE
    const { data: contact, error: fetchError } = await supabaseServer
      .from("contacts")
      .select("current_balance")
      .eq("id", cariId)
      .single();

    if (fetchError || !contact) {
      console.error("Cari bakiye okuma hatası:", fetchError);
      return { success: false, message: "Bakiye okunamadı." };
    }

    const previousBalance = Number(contact.current_balance || 0);

    // 2️⃣ CALCULATE NEW BALANCE
    // ✅ Tahsilat = -tutar (müşteri borcu azalır)
    // ✅ Ödeme = +tutar (tedarikçiye borç artar)
    const balanceChange = islemTuru === "Tahsilat" ? -tutar : tutar;
    const newBalance = previousBalance + balanceChange;

    // 3️⃣ UPDATE CONTACT BALANCE
    const { error: updateError } = await supabaseServer
      .from("contacts")
      .update({ current_balance: newBalance })
      .eq("id", cariId);

    if (updateError) {
      console.error("Cari bakiye güncelleme hatası:", updateError);
      return { success: false, message: "Bakiye güncellenemedi." };
    }

    const actionType = islemTuru === "Tahsilat" ? "manual_collection" : "manual_payment";
    const logNote = `${islemTuru} - ${notlar || "Açıklama yok"}`;

    const { error: logError } = await supabaseServer
      .from("contact_logs")
      .insert([
        {
          business_id: userId,
          contact_id: cariId,
          invoice_id: invoiceId || null,
          action_type: actionType,
          amount_change: balanceChange,
          previous_balance: previousBalance,
          new_balance: newBalance,
          note: logNote,
          created_by: userId,
        },
      ]);

    if (logError) {
      console.error("Contact log kaydedilemedi:", logError);
      return { success: false, message: "İşlem logu kaydedilemedi." };
    }

    // 5️⃣ IF INVOICE SELECTED, UPDATE ITS STATUS IF FULLY PAID
    if (invoiceId) {
      const { data: invoice } = await supabaseServer
        .from("invoices")
        .select("total_amount, exchange_rate")
        .eq("id", invoiceId)
        .single();
        
      if (invoice) {
        const invoiceTotalTry = Number(invoice.total_amount) * (Number(invoice.exchange_rate) || 1);
        if (tutar >= invoiceTotalTry - 0.01) {
          await supabaseServer
            .from("invoices")
            .update({ status: "paid", is_paid: true })
            .eq("id", invoiceId);
        }
      }
    }

    // Audit trail (activity_logs)
    const { data: contactRow } = await supabaseServer
      .from("contacts")
      .select("name")
      .eq("id", cariId)
      .single();

    await logActivity({
      userId,
      module: "contact",
      action: "balance_change",
      entityId: cariId,
      entityName: contactRow?.name ?? null,
      description: `"${contactRow?.name ?? "Cari"}" için ${islemTuru} (${tutar.toLocaleString("tr-TR")} TRY) — Bakiye: ${previousBalance.toFixed(2)} → ${newBalance.toFixed(2)}`,
      metadata: {
        operation: islemTuru,
        amount: tutar,
        previous_balance: previousBalance,
        new_balance: newBalance,
        note: notlar || null,
      },
    });

    revalidatePath(`/contacts/${cariId}`);
    revalidatePath("/contacts");

    return {
      success: true,
      message: `✅ ${islemTuru} ${tutar} TRY olarak kaydedildi (Yeni Bakiye: ${newBalance.toFixed(2)} TRY)`,
    };
  } catch (err) {
    console.error("islemYapAction hatası:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}
