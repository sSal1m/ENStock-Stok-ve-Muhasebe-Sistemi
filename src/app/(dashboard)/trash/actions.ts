"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

/* ═══════════════════════════════════════════
   TEAM RESOLUTION HELPER (SERVER-SIDE
   ═══════════════════════════════════════════ */

async function resolveTeamIdsServer(userId: string): Promise<string[]> {
  try {
    const { data: myProfile } = await supabaseServer
      .from("profiles")
      .select("company_name")
      .eq("id", userId)
      .single();

    const company = myProfile?.company_name;
    if (!company) return [userId];

    const { data: teamProfiles } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("company_name", company);

    if (teamProfiles && teamProfiles.length > 0) {
      return teamProfiles.map((p) => p.id);
    }
    return [userId];
  } catch {
    return [userId];
  }
}

function applyTeamFilterServer(query: any, teamIds: string[], column = "user_id") {
  if (teamIds.length <= 1) {
    return query.eq(column, teamIds[0]);
  }
  return query.in(column, teamIds);
}

/* ═══════════════════════════════════════════
   SOFT DELETE — Ürün
   ═══════════════════════════════════════════ */

export async function softDeleteProduct(productId: string, userId: string) {
  try {
    const { error } = await supabaseServer
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", productId)
      .eq("user_id", userId);

    if (error) {
      console.error("Soft delete product error:", error);
      return { success: false, message: `Silme hatası: ${error.message}` };
    }

    revalidatePath("/inventory");
    revalidatePath("/trash");
    return { success: true, message: "Ürün çöp kutusuna taşındı." };
  } catch (err) {
    console.error("Unexpected soft delete product error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   SOFT DELETE — Cari
   ═══════════════════════════════════════════ */

export async function softDeleteContact(contactId: string, userId: string) {
  try {
    const { error } = await supabaseServer
      .from("contacts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", userId);

    if (error) {
      console.error("Soft delete contact error:", error);
      return { success: false, message: `Silme hatası: ${error.message}` };
    }

    revalidatePath("/contacts");
    revalidatePath("/trash");
    return { success: true, message: "Cari hesap çöp kutusuna taşındı." };
  } catch (err) {
    console.error("Unexpected soft delete contact error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   SOFT DELETE — Fatura
   ═══════════════════════════════════════════ */

export async function softDeleteInvoice(invoiceId: string, userId: string) {
  try {
    // 1. Fatura bilgilerini al (bakiye geri alma için)
    const { data: invoice, error: fetchError } = await supabaseServer
      .from("invoices")
      .select("id, type, total_amount, contact_id, status")
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !invoice) {
      console.error("Fatura bulunamadı:", fetchError);
      return { success: false, message: "Fatura bulunamadı." };
    }

    // 2. Soft delete uygula
    const { error } = await supabaseServer
      .from("invoices")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (error) {
      console.error("Soft delete invoice error:", error);
      return { success: false, message: `Silme hatası: ${error.message}` };
    }

    // 3. Carinin bakiyesini geri al (sadece kesilmiş/pending/paid faturalar için)
    if (invoice.status !== "draft" && invoice.contact_id) {
      // Orijinal fatura oluşturulurken: sales → +total, purchase → -total
      // Geri alma: sales → -total, purchase → +total
      const balanceReversal = invoice.type === "sale" ? -Number(invoice.total_amount) : Number(invoice.total_amount);

      const { data: contact } = await supabaseServer
        .from("contacts")
        .select("current_balance")
        .eq("id", invoice.contact_id)
        .single();

      if (contact) {
        const newBalance = Number(contact.current_balance || 0) + balanceReversal;
        await supabaseServer
          .from("contacts")
          .update({ current_balance: newBalance })
          .eq("id", invoice.contact_id);

        console.log("✅ Fatura silindi, bakiye güncellendi:", { contact_id: invoice.contact_id, change: balanceReversal, newBalance });
      }
    }

    revalidatePath("/invoices");
    revalidatePath("/contacts");
    revalidatePath("/trash");
    return { success: true, message: "Fatura çöp kutusuna taşındı." };
  } catch (err) {
    console.error("Unexpected soft delete invoice error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   GERİ YÜKLE — Ürün
   ═══════════════════════════════════════════ */

export async function restoreProduct(productId: string, userId: string) {
  try {
    const { error } = await supabaseServer
      .from("products")
      .update({ deleted_at: null })
      .eq("id", productId)
      .eq("user_id", userId);

    if (error) {
      console.error("Restore product error:", error);
      return { success: false, message: `Geri yükleme hatası: ${error.message}` };
    }

    revalidatePath("/inventory");
    revalidatePath("/trash");
    return { success: true, message: "Ürün başarıyla geri yüklendi." };
  } catch (err) {
    console.error("Unexpected restore product error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   GERİ YÜKLE — Cari
   ═══════════════════════════════════════════ */

export async function restoreContact(contactId: string, userId: string) {
  try {
    const { error } = await supabaseServer
      .from("contacts")
      .update({ deleted_at: null })
      .eq("id", contactId)
      .eq("user_id", userId);

    if (error) {
      console.error("Restore contact error:", error);
      return { success: false, message: `Geri yükleme hatası: ${error.message}` };
    }

    revalidatePath("/contacts");
    revalidatePath("/trash");
    return { success: true, message: "Cari hesap başarıyla geri yüklendi." };
  } catch (err) {
    console.error("Unexpected restore contact error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   GERİ YÜKLE — Fatura
   ═══════════════════════════════════════════ */

export async function restoreInvoice(invoiceId: string, userId: string) {
  try {
    // 1. Fatura bilgilerini al (bakiye tekrar ekleme için)
    const { data: invoice, error: fetchError } = await supabaseServer
      .from("invoices")
      .select("id, type, total_amount, contact_id, status")
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !invoice) {
      console.error("Fatura bulunamadı:", fetchError);
      return { success: false, message: "Fatura bulunamadı." };
    }

    // 2. Geri yükle (deleted_at = null)
    const { error } = await supabaseServer
      .from("invoices")
      .update({ deleted_at: null })
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (error) {
      console.error("Restore invoice error:", error);
      return { success: false, message: `Geri yükleme hatası: ${error.message}` };
    }

    // 3. Carinin bakiyesini tekrar uygula (sadece kesilmiş faturalar için)
    if (invoice.status !== "draft" && invoice.contact_id) {
      // Fatura geri yüklenince bakiye etkisi tekrar eklenir:
      // sales → +total, purchase → -total
      const balanceChange = invoice.type === "sale" ? Number(invoice.total_amount) : -Number(invoice.total_amount);

      const { data: contact } = await supabaseServer
        .from("contacts")
        .select("current_balance")
        .eq("id", invoice.contact_id)
        .single();

      if (contact) {
        const newBalance = Number(contact.current_balance || 0) + balanceChange;
        await supabaseServer
          .from("contacts")
          .update({ current_balance: newBalance })
          .eq("id", invoice.contact_id);

        console.log("✅ Fatura geri yüklendi, bakiye güncellendi:", { contact_id: invoice.contact_id, change: balanceChange, newBalance });
      }
    }

    revalidatePath("/invoices");
    revalidatePath("/contacts");
    revalidatePath("/trash");
    return { success: true, message: "Fatura başarıyla geri yüklendi." };
  } catch (err) {
    console.error("Unexpected restore invoice error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   KALICI SİL — Ürün
   ═══════════════════════════════════════════ */

export async function permanentDeleteProduct(productId: string, userId: string) {
  try {
    const { error } = await supabaseServer
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("user_id", userId);

    if (error) {
      console.error("Permanent delete product error:", error);
      return { success: false, message: `Kalıcı silme hatası: ${error.message}` };
    }

    revalidatePath("/trash");
    return { success: true, message: "Ürün kalıcı olarak silindi." };
  } catch (err) {
    console.error("Unexpected permanent delete product error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   KALICI SİL — Cari
   ═══════════════════════════════════════════ */

export async function permanentDeleteContact(contactId: string, userId: string) {
  try {
    const { error } = await supabaseServer
      .from("contacts")
      .delete()
      .eq("id", contactId)
      .eq("user_id", userId);

    if (error) {
      console.error("Permanent delete contact error:", error);
      return { success: false, message: `Kalıcı silme hatası: ${error.message}` };
    }

    revalidatePath("/trash");
    return { success: true, message: "Cari hesap kalıcı olarak silindi." };
  } catch (err) {
    console.error("Unexpected permanent delete contact error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   KALICI SİL — Fatura
   ═══════════════════════════════════════════ */

export async function permanentDeleteInvoice(invoiceId: string, userId: string) {
  try {
    // Önce fatura kalemlerini sil
    await supabaseServer
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);

    const { error } = await supabaseServer
      .from("invoices")
      .delete()
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (error) {
      console.error("Permanent delete invoice error:", error);
      return { success: false, message: `Kalıcı silme hatası: ${error.message}` };
    }

    revalidatePath("/trash");
    return { success: true, message: "Fatura kalıcı olarak silindi." };
  } catch (err) {
    console.error("Unexpected permanent delete invoice error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   ÇÖP KUTUSUNDAKİ KAYITLARI GETİR
   ═══════════════════════════════════════════ */

export interface TrashItem {
  id: string;
  type: "product" | "contact" | "invoice";
  name: string;
  detail: string;
  deleted_at: string;
  days_remaining: number;
}

export async function getTrashItems(userId: string): Promise<{ success: boolean; data: TrashItem[]; message?: string }> {
  try {
    const teamIds = await resolveTeamIdsServer(userId);
    const now = new Date();
    const items: TrashItem[] = [];

    // 1. Silinen Ürünler
    const { data: products, error: productsError } = await applyTeamFilterServer(
      supabaseServer
        .from("products")
        .select("id, name, sku, deleted_at")
        .not("deleted_at", "is", null),
      teamIds
    ).order("deleted_at", { ascending: false });

    if (productsError) {
      console.error("Trash products fetch error:", productsError);
    } else if (products) {
      for (const p of products) {
        const deletedDate = new Date(p.deleted_at);
        const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(30 - diffDays, 0);
        items.push({
          id: p.id,
          type: "product",
          name: p.name,
          detail: p.sku ? `SKU: ${p.sku}` : "SKU yok",
          deleted_at: p.deleted_at,
          days_remaining: daysRemaining,
        });
      }
    }

    // 2. Silinen Cariler
    const { data: contacts, error: contactsError } = await applyTeamFilterServer(
      supabaseServer
        .from("contacts")
        .select("id, name, type, phone, deleted_at")
        .not("deleted_at", "is", null),
      teamIds
    ).order("deleted_at", { ascending: false });

    if (contactsError) {
      console.error("Trash contacts fetch error:", contactsError);
    } else if (contacts) {
      for (const c of contacts) {
        const deletedDate = new Date(c.deleted_at);
        const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(30 - diffDays, 0);
        items.push({
          id: c.id,
          type: "contact",
          name: c.name,
          detail: c.type === "customer" ? "Müşteri" : "Tedarikçi",
          deleted_at: c.deleted_at,
          days_remaining: daysRemaining,
        });
      }
    }

    // 3. Silinen Faturalar
    const { data: invoices, error: invoicesError } = await applyTeamFilterServer(
      supabaseServer
        .from("invoices")
        .select("id, invoice_number, type, total_amount, deleted_at")
        .not("deleted_at", "is", null),
      teamIds
    ).order("deleted_at", { ascending: false });

    if (invoicesError) {
      console.error("Trash invoices fetch error:", invoicesError);
    } else if (invoices) {
      for (const inv of invoices) {
        const deletedDate = new Date(inv.deleted_at);
        const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(30 - diffDays, 0);
        items.push({
          id: inv.id,
          type: "invoice",
          name: inv.invoice_number || "Fatura",
          detail: `${inv.type === "sale" ? "Satış" : "Alış"} — ${Number(inv.total_amount).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`,
          deleted_at: inv.deleted_at,
          days_remaining: daysRemaining,
        });
      }
    }

    // Silinme tarihine göre sırala (en son silinen üstte)
    items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

    return { success: true, data: items };
  } catch (err) {
    console.error("Unexpected getTrashItems error:", err);
    return { success: false, data: [], message: "Çöp kutusu yüklenirken hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   ÇÖP KUTUSUNU BOŞALT
   ═══════════════════════════════════════════ */

export async function emptyTrash(userId: string) {
  try {
    const teamIds = await resolveTeamIdsServer(userId);

    // 1. Fatura kalemlerini sil (silinen faturalara ait)
    const { data: deletedInvoices } = await applyTeamFilterServer(
      supabaseServer.from("invoices").select("id").not("deleted_at", "is", null),
      teamIds
    );
    if (deletedInvoices && deletedInvoices.length > 0) {
      const invoiceIds = deletedInvoices.map((inv: any) => inv.id);
      await supabaseServer.from("invoice_items").delete().in("invoice_id", invoiceIds);
    }

    // 2. Faturalar
    const { error: invError } = await applyTeamFilterServer(
      supabaseServer.from("invoices").delete().not("deleted_at", "is", null),
      teamIds
    );
    if (invError) console.error("Empty trash invoices error:", invError);

    // 3. Ürünler
    const { error: prodError } = await applyTeamFilterServer(
      supabaseServer.from("products").delete().not("deleted_at", "is", null),
      teamIds
    );
    if (prodError) console.error("Empty trash products error:", prodError);

    // 4. Cariler
    const { error: contError } = await applyTeamFilterServer(
      supabaseServer.from("contacts").delete().not("deleted_at", "is", null),
      teamIds
    );
    if (contError) console.error("Empty trash contacts error:", contError);

    revalidatePath("/trash");
    return { success: true, message: "Çöp kutusu başarıyla boşaltıldı." };
  } catch (err) {
    console.error("Unexpected emptyTrash error:", err);
    return { success: false, message: "Çöp kutusu boşaltılırken hata oluştu." };
  }
}
