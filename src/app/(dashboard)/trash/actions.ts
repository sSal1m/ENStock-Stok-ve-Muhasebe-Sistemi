"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activityLogger";
import { checkPermission } from "@/lib/authHelpers";

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
      .select("business_id")
      .eq("id", userId)
      .single();

    const businessId = myProfile?.business_id;
    if (!businessId) return [userId];

    const { data: teamProfiles } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("business_id", businessId);

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
  const hasAccess = await checkPermission("stock", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const { data: product } = await supabaseServer
      .from("products")
      .select("name, sku")
      .eq("id", productId)
      .single();

    const { error } = await supabaseServer
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", productId)
      .eq("user_id", userId);

    if (error) {
      console.error("Soft delete product error:", error);
      return { success: false, message: `Silme hatası: ${error.message}` };
    }

    await logActivity({
      userId,
      module: "product",
      action: "delete",
      entityId: productId,
      entityName: product?.name ?? null,
      description: `"${product?.name ?? "Ürün"}" çöp kutusuna taşındı`,
      metadata: { sku: product?.sku ?? null },
    });

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
  const hasAccess = await checkPermission("contacts", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const { data: contact } = await supabaseServer
      .from("contacts")
      .select("name, type")
      .eq("id", contactId)
      .single();

    const { error } = await supabaseServer
      .from("contacts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", userId);

    if (error) {
      console.error("Soft delete contact error:", error);
      return { success: false, message: `Silme hatası: ${error.message}` };
    }

    await logActivity({
      userId,
      module: "contact",
      action: "delete",
      entityId: contactId,
      entityName: contact?.name ?? null,
      description: `"${contact?.name ?? "Cari"}" çöp kutusuna taşındı`,
      metadata: { type: contact?.type ?? null },
    });

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
  const hasAccess = await checkPermission("invoices", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const teamIds = await resolveTeamIdsServer(userId);

    // 1. Fatura bilgilerini al (bakiye geri alma için) — team-scoped
    let fetchQuery = supabaseServer
      .from("invoices")
      .select("id, invoice_number, type, total_amount, exchange_rate, contact_id, status, user_id")
      .eq("id", invoiceId);
    fetchQuery = applyTeamFilterServer(fetchQuery, teamIds);
    const { data: invoice, error: fetchError } = await fetchQuery.single();

    if (fetchError || !invoice) {
      console.error("Fatura bulunamadı:", fetchError);
      return { success: false, message: "Fatura bulunamadı." };
    }

    // 2. Soft delete uygula — use the actual owner's user_id
    const { error } = await supabaseServer
      .from("invoices")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .eq("user_id", invoice.user_id);

    if (error) {
      console.error("Soft delete invoice error:", error);
      return { success: false, message: `Silme hatası: ${error.message}` };
    }

    // 3. Carinin bakiyesini geri al (sadece kesilmiş/pending/paid faturalar için)
    if (invoice.status !== "draft" && invoice.contact_id) {
      const totalAmountTry = Number(invoice.total_amount) * Number(invoice.exchange_rate || 1);
      const balanceReversal = invoice.type === "sale" ? -totalAmountTry : totalAmountTry;

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

    await logActivity({
      userId,
      module: "invoice",
      action: "delete",
      entityId: invoiceId,
      entityName: invoice.invoice_number ?? null,
      description: `"${invoice.invoice_number ?? "Fatura"}" çöp kutusuna taşındı (${invoice.type === "sale" ? "Satış" : "Alış"} - ${Number(invoice.total_amount).toLocaleString("tr-TR")} TRY)`,
      metadata: {
        type: invoice.type,
        total_amount: invoice.total_amount,
        status: invoice.status,
        contact_id: invoice.contact_id,
      },
    });

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
  const hasAccess = await checkPermission("stock", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const { data: product } = await supabaseServer
      .from("products")
      .select("name")
      .eq("id", productId)
      .single();

    const { error } = await supabaseServer
      .from("products")
      .update({ deleted_at: null })
      .eq("id", productId)
      .eq("user_id", userId);

    if (error) {
      console.error("Restore product error:", error);
      return { success: false, message: `Geri yükleme hatası: ${error.message}` };
    }

    await logActivity({
      userId,
      module: "product",
      action: "restore",
      entityId: productId,
      entityName: product?.name ?? null,
      description: `"${product?.name ?? "Ürün"}" çöp kutusundan geri yüklendi`,
    });

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
  const hasAccess = await checkPermission("contacts", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const { data: contact } = await supabaseServer
      .from("contacts")
      .select("name")
      .eq("id", contactId)
      .single();

    const { error } = await supabaseServer
      .from("contacts")
      .update({ deleted_at: null })
      .eq("id", contactId)
      .eq("user_id", userId);

    if (error) {
      console.error("Restore contact error:", error);
      return { success: false, message: `Geri yükleme hatası: ${error.message}` };
    }

    await logActivity({
      userId,
      module: "contact",
      action: "restore",
      entityId: contactId,
      entityName: contact?.name ?? null,
      description: `"${contact?.name ?? "Cari"}" çöp kutusundan geri yüklendi`,
    });

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
  const hasAccess = await checkPermission("invoices", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const teamIds = await resolveTeamIdsServer(userId);

    // 1. Fatura bilgilerini al (bakiye tekrar ekleme için) — team-scoped
    let fetchQuery = supabaseServer
      .from("invoices")
      .select("id, invoice_number, type, total_amount, exchange_rate, contact_id, status, user_id")
      .eq("id", invoiceId);
    fetchQuery = applyTeamFilterServer(fetchQuery, teamIds);
    const { data: invoice, error: fetchError } = await fetchQuery.single();

    if (fetchError || !invoice) {
      console.error("Fatura bulunamadı:", fetchError);
      return { success: false, message: "Fatura bulunamadı." };
    }

    // 2. Geri yükle (deleted_at = null) — use the actual owner's user_id
    const { error } = await supabaseServer
      .from("invoices")
      .update({ deleted_at: null })
      .eq("id", invoiceId)
      .eq("user_id", invoice.user_id);

    if (error) {
      console.error("Restore invoice error:", error);
      return { success: false, message: `Geri yükleme hatası: ${error.message}` };
    }

    // 3. Carinin bakiyesini tekrar uygula (sadece kesilmiş faturalar için)
    if (invoice.status !== "draft" && invoice.contact_id) {
      const totalAmountTry = Number(invoice.total_amount) * Number(invoice.exchange_rate || 1);
      const balanceChange = invoice.type === "sale" ? totalAmountTry : -totalAmountTry;

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

    await logActivity({
      userId,
      module: "invoice",
      action: "restore",
      entityId: invoiceId,
      entityName: invoice.invoice_number ?? null,
      description: `"${invoice.invoice_number ?? "Fatura"}" çöp kutusundan geri yüklendi`,
      metadata: { type: invoice.type, total_amount: invoice.total_amount },
    });

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
  const hasAccess = await checkPermission("stock", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const { data: product } = await supabaseServer
      .from("products")
      .select("name, sku")
      .eq("id", productId)
      .single();

    const { error } = await supabaseServer
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("user_id", userId);

    if (error) {
      console.error("Permanent delete product error:", error);
      return { success: false, message: `Kalıcı silme hatası: ${error.message}` };
    }

    await logActivity({
      userId,
      module: "product",
      action: "permanent_delete",
      entityId: productId,
      entityName: product?.name ?? null,
      description: `"${product?.name ?? "Ürün"}" kalıcı olarak silindi`,
      metadata: { sku: product?.sku ?? null },
    });

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
  const hasAccess = await checkPermission("contacts", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const { data: contact } = await supabaseServer
      .from("contacts")
      .select("name, type")
      .eq("id", contactId)
      .single();

    const { error } = await supabaseServer
      .from("contacts")
      .delete()
      .eq("id", contactId)
      .eq("user_id", userId);

    if (error) {
      console.error("Permanent delete contact error:", error);
      return { success: false, message: `Kalıcı silme hatası: ${error.message}` };
    }

    await logActivity({
      userId,
      module: "contact",
      action: "permanent_delete",
      entityId: contactId,
      entityName: contact?.name ?? null,
      description: `"${contact?.name ?? "Cari"}" kalıcı olarak silindi`,
      metadata: { type: contact?.type ?? null },
    });

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
  const hasAccess = await checkPermission("invoices", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const { data: invoice } = await supabaseServer
      .from("invoices")
      .select("invoice_number, type, total_amount")
      .eq("id", invoiceId)
      .single();

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

    await logActivity({
      userId,
      module: "invoice",
      action: "permanent_delete",
      entityId: invoiceId,
      entityName: invoice?.invoice_number ?? null,
      description: `"${invoice?.invoice_number ?? "Fatura"}" kalıcı olarak silindi`,
      metadata: { type: invoice?.type ?? null, total_amount: invoice?.total_amount ?? null },
    });

    revalidatePath("/trash");
    return { success: true, message: "Fatura kalıcı olarak silindi." };
  } catch (err) {
    console.error("Unexpected permanent delete invoice error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   SOFT DELETE / GERİ YÜKLE / KALICI SİL — Teklif
   ═══════════════════════════════════════════ */

export async function softDeleteQuote(quoteId: string, userId: string) {
  const hasAccess = await checkPermission("quotes", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const teamIds = await resolveTeamIdsServer(userId);

    // Team-scoped: teklifi takım üyelerinden herhangi biri silebilir
    let fetchQuery = supabaseServer
      .from("quotes")
      .select("id, user_id")
      .eq("id", quoteId);
    fetchQuery = applyTeamFilterServer(fetchQuery, teamIds);
    const { data: quote, error: fetchError } = await fetchQuery.single();

    if (fetchError || !quote) {
      console.error("Teklif bulunamadı:", fetchError);
      return { success: false, message: "Teklif bulunamadı." };
    }

    const { error } = await supabaseServer
      .from("quotes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", quoteId)
      .eq("user_id", quote.user_id);

    if (error) {
      console.error("Soft delete quote error:", error);
      return { success: false, message: `Silme hatası: ${error.message}` };
    }

    revalidatePath("/quotes");
    revalidatePath("/trash");
    return { success: true, message: "Teklif çöp kutusuna taşındı." };
  } catch (err) {
    console.error("Unexpected soft delete quote error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

export async function restoreQuote(quoteId: string, userId: string) {
  const hasAccess = await checkPermission("quotes", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const teamIds = await resolveTeamIdsServer(userId);

    // Team-scoped: teklifin sahibini bul
    let fetchQuery = supabaseServer
      .from("quotes")
      .select("id, user_id")
      .eq("id", quoteId);
    fetchQuery = applyTeamFilterServer(fetchQuery, teamIds);
    const { data: quote, error: fetchError } = await fetchQuery.single();

    if (fetchError || !quote) {
      return { success: false, message: "Teklif bulunamadı." };
    }

    const { error } = await supabaseServer
      .from("quotes")
      .update({ deleted_at: null })
      .eq("id", quoteId)
      .eq("user_id", quote.user_id);

    if (error) {
      console.error("Restore quote error:", error);
      return { success: false, message: `Geri yükleme hatası: ${error.message}` };
    }

    revalidatePath("/quotes");
    revalidatePath("/trash");
    return { success: true, message: "Teklif başarıyla geri yüklendi." };
  } catch (err) {
    console.error("Unexpected restore quote error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

export async function permanentDeleteQuote(quoteId: string, userId: string) {
  const hasAccess = await checkPermission("quotes", "can_delete");
  if (!hasAccess) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
  }

  try {
    const teamIds = await resolveTeamIdsServer(userId);

    // Team-scoped: teklifin sahibini bul
    let fetchQuery = supabaseServer
      .from("quotes")
      .select("id, user_id")
      .eq("id", quoteId);
    fetchQuery = applyTeamFilterServer(fetchQuery, teamIds);
    const { data: quote } = await fetchQuery.single();

    if (!quote) {
      return { success: false, message: "Teklif bulunamadı." };
    }

    await supabaseServer
      .from("quote_items")
      .delete()
      .eq("quote_id", quoteId);

    const { error } = await supabaseServer
      .from("quotes")
      .delete()
      .eq("id", quoteId)
      .eq("user_id", quote.user_id);

    if (error) {
      console.error("Permanent delete quote error:", error);
      return { success: false, message: `Kalıcı silme hatası: ${error.message}` };
    }

    revalidatePath("/trash");
    return { success: true, message: "Teklif kalıcı olarak silindi." };
  } catch (err) {
    console.error("Unexpected permanent delete quote error:", err);
    return { success: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

/* ═══════════════════════════════════════════
   ÇÖP KUTUSUNDAKİ KAYITLARI GETİR
   ═══════════════════════════════════════════ */

export interface TrashItem {
  id: string;
  type: "product" | "contact" | "invoice" | "quote";
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

    // 4. Silinen Teklifler
    const { data: quotes, error: quotesError } = await applyTeamFilterServer(
      supabaseServer
        .from("quotes")
        .select("id, quote_number, total_amount, deleted_at")
        .not("deleted_at", "is", null),
      teamIds
    ).order("deleted_at", { ascending: false });

    if (quotesError) {
      console.error("Trash quotes fetch error:", quotesError);
    } else if (quotes) {
      for (const q of quotes) {
        const deletedDate = new Date(q.deleted_at);
        const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(30 - diffDays, 0);
        items.push({
          id: q.id,
          type: "quote",
          name: q.quote_number || "Teklif",
          detail: `Teklif — ${Number(q.total_amount).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`,
          deleted_at: q.deleted_at,
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
    const canDeleteStock = await checkPermission("stock", "can_delete");
    const canDeleteContacts = await checkPermission("contacts", "can_delete");
    const canDeleteInvoices = await checkPermission("invoices", "can_delete");
    const canDeleteQuotes = await checkPermission("quotes", "can_delete");

    if (!canDeleteStock && !canDeleteContacts && !canDeleteInvoices && !canDeleteQuotes) {
      return { success: false, message: "Bu işlem için yetkiniz bulunmamaktadır." };
    }

    const teamIds = await resolveTeamIdsServer(userId);

    // 1. Fatura kalemlerini sil (silinen faturalara ait)
    if (canDeleteInvoices) {
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
    }

    // 3. Ürünler
    if (canDeleteStock) {
      const { error: prodError } = await applyTeamFilterServer(
        supabaseServer.from("products").delete().not("deleted_at", "is", null),
        teamIds
      );
      if (prodError) console.error("Empty trash products error:", prodError);
    }

    // 4. Cariler
    if (canDeleteContacts) {
      const { error: contError } = await applyTeamFilterServer(
        supabaseServer.from("contacts").delete().not("deleted_at", "is", null),
        teamIds
      );
      if (contError) console.error("Empty trash contacts error:", contError);
    }

    // 5. Teklif kalemlerini sil
    if (canDeleteQuotes) {
      const { data: deletedQuotes } = await applyTeamFilterServer(
        supabaseServer.from("quotes").select("id").not("deleted_at", "is", null),
        teamIds
      );
      if (deletedQuotes && deletedQuotes.length > 0) {
        const quoteIds = deletedQuotes.map((q: any) => q.id);
        await supabaseServer.from("quote_items").delete().in("quote_id", quoteIds);
      }

      // 6. Teklifler
      const { error: quoteError } = await applyTeamFilterServer(
        supabaseServer.from("quotes").delete().not("deleted_at", "is", null),
        teamIds
      );
      if (quoteError) console.error("Empty trash quotes error:", quoteError);
    }

    revalidatePath("/trash");
    return { success: true, message: "Çöp kutusu başarıyla boşaltıldı." };
  } catch (err) {
    console.error("Unexpected emptyTrash error:", err);
    return { success: false, message: "Çöp kutusu boşaltılırken hata oluştu." };
  }
}
