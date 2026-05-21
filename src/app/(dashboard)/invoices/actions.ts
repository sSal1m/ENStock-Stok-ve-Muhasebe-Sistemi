"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activityLogger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

/* ═══════════════════════════════════════════
   TEAM RESOLUTION HELPER (SERVER-SIDE)
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
   TYPE DEFINITIONS
   ═══════════════════════════════════════════ */

export interface InvoiceLineItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface CreateInvoiceRequest {
  user_id: string;
  contact_id: string;
  invoice_type: "sales" | "purchase";
  issue_date: string;
  notes?: string;
  line_items: InvoiceLineItem[];
  status?: "draft" | "pending";  // ✅ draft veya pending statüsü
  invoice_id?: string;  // ✅ NEW: draft faturayı update etmek için
  invoice_number?: string; // ✅ Manuel fatura numarası için
  currency?: string; // ✅ NEW: Para birimi (TRY, USD, EUR vb.)
  exchange_rate?: number; // ✅ NEW: Kur değeri
}

export interface InvoiceActionState {
  success: boolean;
  message: string;
  invoice_id?: string;
  errors?: Record<string, string>;
}

/* ═══════════════════════════════════════════
   VALIDATION HELPER
   ═══════════════════════════════════════════ */

async function validateStockAvailability(
  userId: string,
  invoiceType: "sales" | "purchase",
  lineItems: InvoiceLineItem[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of lineItems) {
    // Get product details
    const { data: product, error: productError } = await supabaseServer
      .from("products")
      .select("id, name, stock_quantity")
      .eq("id", item.product_id)
      .eq("user_id", userId)
      .single();

    if (productError || !product) {
      errors.push(`Ürün bulunamadı: ${item.product_id}`);
      continue;
    }

    // Check stock only for sales invoices
    if (invoiceType === "sales" && product.stock_quantity < item.quantity) {
      errors.push(
        `${product.name} için stok yetersiz! Mevcut: ${product.stock_quantity}, İstenen: ${item.quantity}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ═══════════════════════════════════════════
   SEARCH CONTACTS
   ═══════════════════════════════════════════ */

export async function searchContacts(userId: string, query: string) {
  if (!query || query.length < 1) {
    return { success: false, data: [], message: "En az 1 karakter girin" };
  }

  const teamIds = await resolveTeamIdsServer(userId);

  const { data, error } = await applyTeamFilterServer(
    supabaseServer
      .from("contacts")
      .select("id, name, tax_number, tax_office, type")
      .is("deleted_at", null),
    teamIds
  )
    .or(`name.ilike.%${query}%,tax_number.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error("Contact search error:", error);
    return { success: false, data: [], message: "Arama başarısız" };
  }

  return { success: true, data: data || [] };
}

/* ═══════════════════════════════════════════
   SEARCH PRODUCTS
   ═══════════════════════════════════════════ */

export async function searchProducts(userId: string, query: string, invoiceType: "sales" | "purchase") {
  if (!query || query.length < 1) {
    return { success: false, data: [], message: "En az 1 karakter girin" };
  }

  const teamIds = await resolveTeamIdsServer(userId);

  const { data, error } = await applyTeamFilterServer(
    supabaseServer
      .from("products")
      .select("id, name, sku, stock_quantity, sale_price, purchase_price, currency, sale_price_in_currency, purchase_price_in_currency, tax_rate")
      .is("deleted_at", null),
    teamIds
  )
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error("Product search error:", error);
    return { success: false, data: [], message: "Arama başarısız" };
  }

  return { success: true, data: data || [] };
}

/* ═══════════════════════════════════════════
   GET INVOICE SEQUENCE (for invoice number generation)
   ═══════════════════════════════════════════ */

export async function getNextInvoiceNumber(userId: string, invoiceType: "sales" | "purchase") {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    
    const teamIds = await resolveTeamIdsServer(userId);

    // Bugün oluşturulan son faturayı bul
    const { data: todayInvoices, error: todayError } = await applyTeamFilterServer(
      supabaseServer
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", `FTR-${todayStr}-%`),
      teamIds
    )
      .order("created_at", { ascending: false })
      .limit(1);

    if (todayError) {
      console.error("Error fetching today's invoices:", todayError);
      return `FTR-${todayStr}-001`;
    }

    if (!todayInvoices || todayInvoices.length === 0) {
      return `FTR-${todayStr}-001`; // İlk fatura bugün
    }

    // Son faturanın sıra numarasını çıkar (FTR-2026-05-03-001 ise 001'i al)
    const lastNumberStr = todayInvoices[0].invoice_number;
    const match = lastNumberStr.match(/-(\d+)$/);
    if (match && match[1]) {
      const nextSeq = parseInt(match[1], 10) + 1;
      return `FTR-${todayStr}-${nextSeq.toString().padStart(3, "0")}`;
    }

    return `FTR-${todayStr}-001`;
  } catch (err) {
    console.error("Unexpected error in getNextInvoiceNumber:", err);
    const today = new Date();
    return `FTR-${today.toISOString().split("T")[0]}-001`;
  }
}

/* ═══════════════════════════════════════════
   CREATE INVOICE (Main Server Action)
   With atomic transaction-like behavior
   ═══════════════════════════════════════════ */

export async function createInvoiceAction(request: CreateInvoiceRequest): Promise<InvoiceActionState> {
  const { 
    user_id, contact_id, invoice_type, issue_date, notes, line_items, 
    status = "draft", invoice_id, invoice_number: reqInvoiceNumber,
    currency = "TRY", exchange_rate = 1 
  } = request;

  // 1) auth.getUser() kontrolü (Kullanıcının sisteme gerçekten login olup olmadığını ve token'ı doğrulamak için)
  // Not: supabaseServer service_role ile oluşturulduğundan, auth context'i taşıması için ek ayarlarınız olabilir.
  // Bu yüzden null gelirse diye güvenlik kontrolü ekliyoruz:
  const { data: authData, error: authError } = await supabaseServer.auth.getUser();
  if (authError || !authData?.user) {
    console.warn("⚠️ auth.getUser() null veya hatalı döndü:", authError?.message);
    // return { success: false, message: "Oturum süreniz dolmuş veya yetkisiz işlem." }; 
    // YORUM: Projenizde service_role kullanımı sebebiyle burası bloklamasın diye warn bıraktık. Eğer isterseniz return satırının yorumunu kaldırın.
  }

  // 2) Console log ile gönderilen verilerin basılması
  console.log('Gönderilen Veri:', { 
    user_id, 
    created_by: user_id, 
    contact_id,
    invoice_type 
  });

  // Validation
  if (!user_id || !contact_id || !invoice_type || !issue_date || !line_items || line_items.length === 0) {
    console.error("❌ Form validation failed:", { user_id, contact_id, invoice_type, issue_date, lineItemsCount: line_items?.length });
    return {
      success: false,
      message: "Eksik veya hatalı form verisi",
      errors: { form: "Tüm alanları doldurunuz" },
    };
  }

  // ✅ Taslak faturadaysa sadece stok validasyonu yapma
  if (status !== "draft" && invoice_type === "sales") {
    const stockValidation = await validateStockAvailability(user_id, invoice_type, line_items);
    if (!stockValidation.valid) {
      return {
        success: false,
        message: "Stok kontrolü hata",
        errors: { stock: stockValidation.errors.join("; ") },
      };
    }
  }

  try {
    // Calculate totals
    let subtotal = 0;
    let vatTotal = 0;
    const lineItemsWithTotals = line_items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const vatRate = Number(item.vat_rate);
      
      const lineSubtotal = quantity * unitPrice;
      const lineVat = lineSubtotal * (vatRate / 100);
      subtotal += lineSubtotal;
      vatTotal += lineVat;
      return { 
        ...item, 
        quantity,
        unit_price: unitPrice,
        vat_rate: vatRate,
        line_subtotal: lineSubtotal, 
        line_vat: lineVat 
      };
    });
    const totalAmount = subtotal + vatTotal;

    // ═══════════════════════════════════════════
    // STEP 1: CREATE OR UPDATE INVOICE RECORD
    // ═══════════════════════════════════════════
    // ✅ Hardcode enum mapping for invoices.type
    const dbInvoiceType = invoice_type.toLowerCase().includes('sale') ? 'sale' : 'purchase';
    let newInvoice;
    let invoiceIdToUse: string;

    // ═══════════════════════════════════════════
    // Fatura Numarası Atama ve Çakışma Kontrolü
    // ═══════════════════════════════════════════
    
    // (FIX for 23503 FK Violation: Ensure user profile exists for invoices_created_by_fkey constraint)
    // full_name is required in the profiles table, so we provide a placeholder if creating a new one.
    const { error: profileUpsertError } = await supabaseServer.from("profiles").upsert(
      { id: user_id, full_name: "Firma Yetkilisi" }, 
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (profileUpsertError) {
      console.warn("Profile upsert warning:", profileUpsertError.message);
    }

    let finalInvoiceNumber = reqInvoiceNumber;

    if (!finalInvoiceNumber || finalInvoiceNumber.trim() === "") {
       const nextNum = await getNextInvoiceNumber(user_id, invoice_type);
       finalInvoiceNumber = `FTR-${new Date(issue_date).getFullYear()}-${nextNum.toString().padStart(3, "0")}`;
    }

    // Uniqueness validation
    let conflictQuery = supabaseServer.from("invoices").select("id").eq("invoice_number", finalInvoiceNumber);
    if (invoice_id) {
       conflictQuery = conflictQuery.neq("id", invoice_id);
    }
    const { data: existingRecords } = await conflictQuery.limit(1);
    if (existingRecords && existingRecords.length > 0) {
       return {
          success: false,
          message: "Bu numara zaten kullanımda",
          errors: { invoice_number: "Seçtiğiniz fatura numarası başka bir faturada kullanılmış" }
       };
    }

    // TRY karşılıkları — currency-blind agregasyonlar için (dashboard, raporlar)
    const totalAmountTry = totalAmount * (exchange_rate || 1);
    const subtotalTry    = subtotal    * (exchange_rate || 1);
    const taxTotalTry    = vatTotal    * (exchange_rate || 1);

    if (invoice_id) {
      // ✅ Update existing draft invoice
      const { data: updatedInvoice, error: updateError } = await supabaseServer
        .from("invoices")
        .update({
          contact_id,
          type: dbInvoiceType,
          invoice_number: finalInvoiceNumber,
          issue_date,
          subtotal,
          tax_total: vatTotal,
          total_amount: totalAmount,
          subtotal_try: subtotalTry,
          tax_total_try: taxTotalTry,
          total_amount_try: totalAmountTry,
          notes: notes || null,
          status: status,
          currency,
          exchange_rate,
        })
        .eq("id", invoice_id)
        .select()
        .single();

      if (updateError || !updatedInvoice) {
        if (updateError?.message?.includes('Bu varlık size ait değil')) {
          return {
            success: false,
            message: "Bu varlık size ait değil"
          };
        }
        console.error("❌ [STEP 1-UPDATE] Fatura güncellenirken hata:", {
          message: updateError?.message,
          code: updateError?.code,
          invoice_id,
        });
        return {
          success: false,
          message: "Fatura güncellenemedi",
          errors: {
            step: "1-update",
            code: updateError?.code || "UNKNOWN",
          },
        };
      }

      newInvoice = updatedInvoice;
      invoiceIdToUse = invoice_id;

      // ✅ Delete old invoice items (reinsert them)
      await supabaseServer
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoice_id);

    } else {
      // ✅ Create new invoice
      const { data: createdInvoice, error: invoiceError } = await supabaseServer
        .from("invoices")
        .insert([
          {
            user_id,
            created_by: user_id,
            contact_id,
            type: dbInvoiceType,
            invoice_number: finalInvoiceNumber,
            issue_date,
            subtotal,
            tax_total: vatTotal,
            total_amount: totalAmount,
            subtotal_try: subtotalTry,
            tax_total_try: taxTotalTry,
            total_amount_try: totalAmountTry,
            notes: notes || null,
            status: status,
            currency,
            exchange_rate,
          },
        ])
        .select()
        .single();

      if (invoiceError || !createdInvoice) {
        if (invoiceError?.message?.includes('Bu varlık size ait değil')) {
          return {
            success: false,
            message: "Bu varlık size ait değil"
          };
        }
        console.error("❌ [STEP 1-CREATE] Fatura kaydı oluştururken hata:", {
          message: invoiceError?.message,
          code: invoiceError?.code,
          user_id,
          contact_id,
        });
        return {
          success: false,
          message: "Fatura kaydı oluşturulamadı",
          errors: {
            step: "1-create",
            code: invoiceError?.code || "UNKNOWN",
          },
        };
      }

      newInvoice = createdInvoice;
      invoiceIdToUse = createdInvoice.id;
    }

    const previousInvoiceId = invoiceIdToUse;

    // ═══════════════════════════════════════════
    // STEP 2: CREATE INVOICE ITEMS
    // ═══════════════════════════════════════════
    const invoiceItemsToInsert = lineItemsWithTotals.map((item) => ({
      invoice_id: invoiceIdToUse,
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      vat_rate: Number(item.vat_rate),
      line_total: Number(item.line_subtotal + item.line_vat),
    }));

    const { error: itemsError } = await supabaseServer
      .from("invoice_items")
      .insert(invoiceItemsToInsert);

    if (itemsError) {
      // Only rollback if creating new invoice
      if (!invoice_id) {
        await supabaseServer.from("invoices").delete().eq("id", invoiceIdToUse);
      }
      
      if (itemsError?.message?.includes('Bu varlık size ait değil')) {
        return {
          success: false,
          message: "Bu varlık size ait değil"
        };
      }
      
      console.error("❌ [STEP 2] Fatura satırları oluştururken hata:", {
        message: itemsError?.message,
        code: itemsError?.code,
        details: itemsError?.details,
        invoiceId: invoiceIdToUse,
        itemCount: invoiceItemsToInsert.length,
      });
      return {
        success: false,
        message: "Fatura satırları oluşturulamadı. Lütfen ürünleri kontrol edin.",
        errors: {
          step: "2",
          code: itemsError?.code || "UNKNOWN",
        },
      };
    }

    // ═══════════════════════════════════════════
    // ✅ ONLY IF STATUS !== 'DRAFT': Process Stok & Bakiye
    // ═══════════════════════════════════════════
    let failedProducts: string[] = [];

    if (status !== "draft") {
      // ✅ Check if this is a state transition from draft -> paid
      // NOT a re-save of already paid invoice
      let shouldProcessStock = true;
      
      if (invoice_id) {
        // Only process stock if transitioning FROM draft TO paid
        // Query the OLD invoice to check its previous status
        const { data: oldInvoiceData } = await supabaseServer
          .from("invoices")
          .select("status")
          .eq("id", invoice_id)
          .single();

        // If it was already paid, don't process stock again
        if (oldInvoiceData?.status === "paid") {
          shouldProcessStock = false;
          console.log("📝 [STEP 3-4 SKIP] Fatura zaten ödenmiş, stok tekrar düşmüyor (mükerrer işlem önlenmiş)");
        }
      }

      if (shouldProcessStock) {
        // ═══════════════════════════════════════════
        // STEP 3 & 4: UPDATE STOCK & CREATE INVENTORY LOGS
        // ═══════════════════════════════════════════
        
        for (const item of lineItemsWithTotals) {
          try {
            // Get current stock
            const { data: product, error: getProductError } = await supabaseServer
              .from("products")
              .select("id, name, stock_quantity")
              .eq("id", item.product_id)
              .eq("user_id", user_id)
              .single();

            if (getProductError || !product) {
              console.error(`[STEP 3] Error fetching product ${item.product_id}:`, getProductError);
              failedProducts.push(`${item.product_id}: Ürün bulunamadı`);
              continue;
            }

            const oldStock = Number(product.stock_quantity);
            const quantity = Number(item.quantity);
            const newStock = invoice_type === "sales" ? oldStock - quantity : oldStock + quantity;

            // Update stock
            const { error: updateError } = await supabaseServer
              .from("products")
              .update({ stock_quantity: newStock })
              .eq("id", item.product_id)
              .eq("user_id", user_id);

            if (updateError) {
              console.error(`[STEP 3] Error updating stock for product ${item.product_id}:`, updateError);
              failedProducts.push(`${product.name}: Stok güncellenemedi`);
              continue;
            }

            // Create inventory log
            const actionType = invoice_type === "sales" ? "sale" : "purchase";
            const invoiceNumber = newInvoice.invoice_number;
            const logNote =
              invoice_type === "sales"
                ? `FTR-${new Date(issue_date).getFullYear()}-${invoiceNumber.toString().padStart(3, "0")} nolu fatura ile stok çıkışı`
                : `FTR-${new Date(issue_date).getFullYear()}-${invoiceNumber.toString().padStart(3, "0")} nolu fatura ile stok girişi`;

            const { error: logError } = await supabaseServer
              .from("inventory_logs")
              .insert([
                {
                  user_id,
                product_id: item.product_id,
                action_type: actionType,
                quantity_change: Number(invoice_type === "sales" ? -quantity : quantity),
                previous_stock: Number(oldStock),
                new_stock: Number(newStock),
                unit_price: Number(item.unit_price),
                note: logNote,
              },
            ]);

          if (logError) {
            console.error(`❌ [STEP 4] Error creating inventory log for product ${item.product_id}:`, {
              code: logError?.code,
              message: logError?.message,
              productId: item.product_id,
              actionType,
            });
            failedProducts.push(`${product.name}: Stok hareketi kaydedilemedi`);
          }
        } catch (err) {
          console.error(`[STEP 3-4] Unexpected error for product ${item.product_id}:`, err);
          failedProducts.push(`${item.product_id}: Beklenmeyen hata`);
        }
      }
      } // ✅ Close shouldProcessStock if

      // ═══════════════════════════════════════════
      // STEP 5: CREATE CASH TRANSACTION (only if transitioning from draft->paid)
      // ═══════════════════════════════════════════
      if (shouldProcessStock) {  // ✅ Only if transitioning from draft->paid
        // ✅ Hardcode enum mapping for cash_transactions.transaction_type
        const dbTransactionType = invoice_type.toLowerCase().includes('sale') ? 'sale' : 'purchase';
        // cash_transactions.amount HER ZAMAN TRY'de tutulur (raporlama agregasyonları
        // currency-blind toplama yaptığı için). Fatura currency'sinden exchange_rate
        // ile TRY'ye normalize ediliyor.
        const amount = Number(totalAmount) * Number(exchange_rate || 1);

        const { error: transactionError } = await supabaseServer
          .from("cash_transactions")
          .insert([
            {
              user_id,
              contact_id,
              invoice_id: invoiceIdToUse,
              transaction_type: dbTransactionType,
              amount,
              description: `Fatura #${newInvoice.invoice_number} - ${dbTransactionType === "sale" ? "Alacak" : "Borç"}`,
            },
          ]);

        if (transactionError) {
          console.error("❌ [STEP 5] Error creating cash transaction:", {
            code: transactionError?.code,
            message: transactionError?.message,
          });
          
          return {
            success: false,
            message: `Fatura oluşturuldu ama nakit işlemi kaydedilemedi`,
            invoice_id: invoiceIdToUse,
            errors: {
              step: "5",
              code: transactionError?.code || "UNKNOWN",
            },
          };
        }
      } else {
        console.log("📝 [STEP 5 SKIP] Fatura zaten kesikmiş, nakit işlemi tekrar oluşturmuyor");
      }

      // ═══════════════════════════════════════════
      // STEP 6: UPDATE CONTACT BALANCE + CREATE CONTACT LOG
      // ═══════════════════════════════════════════
      // ✅ inventory_logs pattern: bakiye UPDATE + contact_logs INSERT
      if (shouldProcessStock) {  // ✅ Only if transitioning from draft->paid
        // contacts.current_balance ve contact_logs HER ZAMAN TRY'de tutulur.
        // Fatura currency'sindeki tutar exchange_rate ile normalize edilir.
        const totalAmountTryForBalance = Number(totalAmount) * Number(exchange_rate || 1);
        const balanceChange = invoice_type === "sales" ? totalAmountTryForBalance : -totalAmountTryForBalance;
        
        const { data: currentContact, error: fetchError } = await supabaseServer
          .from("contacts")
          .select("current_balance")
          .eq("id", contact_id)
          .single();

        if (fetchError) {
          console.error("❌ [STEP 6] Error fetching contact balance:", fetchError);
        } else if (currentContact) {
          const previousBalance = Number(currentContact.current_balance || 0);
          const newBalance = previousBalance + balanceChange;
          
          // ✅ UPDATE contact balance
          const { error: updateError } = await supabaseServer
            .from("contacts")
            .update({ current_balance: newBalance })
            .eq("id", contact_id);

          if (updateError) {
            console.error("❌ [STEP 6] Error updating contact balance:", {
              code: updateError?.code,
              contact_id,
            });
          } else {
            // ✅ INSERT contact_logs record (audit trail)
            const actionType = invoice_type === "sales" ? "invoice_sale" : "invoice_purchase";
            const note = `Fatura ${newInvoice.invoice_number} - ${invoice_type === "sales" ? "Satış" : "Alış"} İşlemi`;
            
            const { error: logError } = await supabaseServer
              .from("contact_logs")
              .insert([
                {
                  business_id: user_id,
                  contact_id,
                  invoice_id: invoiceIdToUse,
                  action_type: actionType,
                  amount_change: balanceChange,
                  previous_balance: previousBalance,
                  new_balance: newBalance,
                  note,
                  created_by: user_id,
                },
              ]);

            if (logError) {
              console.error("❌ [STEP 6] Error creating contact log:", {
                code: logError?.code,
                message: logError?.message,
                contact_id,
              });
            } else {
              console.log("✅ [STEP 6] Contact balance updated & logged:", {
                contact_id,
                previousBalance,
                newBalance,
                change: balanceChange,
                actionType,
              });
            }
          }
        }
      } else {
        console.log("📝 [STEP 6 SKIP] Fatura zaten kesikmiş, bakiye tekrar güncellemiyor");
      }
    } else {
      // ✅ Draft statüsü: Sadece fatura ve kalemler kaydedilir
      console.log("📝 [DRAFT] Invoice saved as draft - no stock or balance changes");
    }

    // Audit trail (activity_logs)
    await logActivity({
      userId: user_id,
      module: "invoice",
      action: invoice_id ? "update" : "create",
      entityId: invoiceIdToUse,
      entityName: newInvoice.invoice_number ?? finalInvoiceNumber,
      description: `${invoice_id ? "Güncellendi" : "Oluşturuldu"}: ${invoice_type === "sales" ? "Satış" : "Alış"} faturası "${newInvoice.invoice_number ?? finalInvoiceNumber}" (${Number(totalAmount).toLocaleString("tr-TR")} ${currency}) - ${status === "draft" ? "Taslak" : "Kesildi"}`,
      metadata: {
        type: dbInvoiceType,
        status,
        total_amount: totalAmount,
        currency,
        contact_id,
        line_items_count: line_items.length,
      },
    });

    revalidatePath("/invoices");
    revalidatePath("/contacts");
    revalidatePath(`/contacts/${contact_id}`);

    // ✅ Success logic
    if (status === "draft") {
      return {
        success: true,
        message: "✅ Fatura taslak olarak kaydedildi",
        invoice_id: invoiceIdToUse,
      };
    }

    // Check if there were any failures in stock updates
    if (failedProducts.length > 0) {
      return {
        success: true,
        message: `✅ Fatura kaydedildi ama ${failedProducts.length} üründe sorun: ${failedProducts.join("; ")}`,
        invoice_id: invoiceIdToUse,
        errors: { products: failedProducts.join("; ") },
      };
    }

    return {
      success: true,
      message: "✅ Fatura başarıyla kesildi ve stok güncellendi",
      invoice_id: invoiceIdToUse,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    
    if (errorMessage.includes('Bu varlık size ait değil')) {
      return {
        success: false,
        message: "Bu varlık size ait değil"
      };
    }

    const errorStack = (err instanceof Error ? err.stack : "") || "";
    console.error("❌ [MAIN] Unexpected error in createInvoiceAction:", {
      message: errorMessage,
      stack: errorStack,
      type: typeof err,
    });
    return {
      success: false,
      message: "Beklenmeyen bir sunucu hatası oluştu. Lütfen tekrar deneyiniz.",
      errors: {
        system: errorMessage,
        details: errorStack,
      },
    };
  }
}

/* ═══════════════════════════════════════════
   UPDATE PROPOSAL ACTION
   ═══════════════════════════════════════════ */

export async function updateProposalAction(
  formData: FormData
): Promise<InvoiceActionState> {
  try {
    const userId = formData.get("user_id") as string;
    const proposalId = formData.get("proposal_id") as string;
    const proposalType = formData.get("proposal_type") as "sale" | "purchase";
    const issueDate = formData.get("issue_date") as string;
    const notes = formData.get("notes") as string;
    const contactId = formData.get("contact_id") as string;
    const lineItemsJson = formData.get("line_items") as string;

    if (!userId || !proposalId || !proposalType || !contactId) {
      return {
        success: false,
        message: "Eksik bilgi. Teklif ve cari bilgisi zorunludur.",
      };
    }

    const lineItems: InvoiceLineItem[] = JSON.parse(lineItemsJson || "[]");
    
    if (lineItems.length === 0) {
      return {
        success: false,
        message: "Teklifte en az bir ürün olması zorunludur.",
      };
    }

    // Calculate totals
    let totalBeforeTax = 0;
    let totalTax = 0;
    const processedItems = lineItems.map((item) => {
      const lineBefore = item.quantity * item.unit_price;
      const lineVat = lineBefore * (item.vat_rate / 100);
      totalBeforeTax += lineBefore;
      totalTax += lineVat;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        line_total: lineBefore + lineVat,
      };
    });

    const totalAmount = totalBeforeTax + totalTax;

    // Delete old proposal items
    await supabaseServer.from("invoice_items").delete().eq("invoice_id", proposalId);

    // Insert new proposal items
    const proposalItemsToInsert = processedItems.map((item) => ({
      invoice_id: proposalId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      line_total: item.line_total,
    }));

    const { error: insertItemsError } = await supabaseServer
      .from("invoice_items")
      .insert(proposalItemsToInsert);

    if (insertItemsError) {
      return {
        success: false,
        message: "Teklif satırları eklenirken hata oluştu.",
      };
    }

    // Update proposal
    const { error: updateError } = await supabaseServer
      .from("invoices")
      .update({
        contact_id: contactId,
        issue_date: issueDate,
        notes: notes || null,
        total_amount: totalAmount,
        tax_total: totalTax,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("user_id", userId)
      .eq("type", "proposal");

    if (updateError) {
      return {
        success: false,
        message: "Teklif güncellenirken hata oluştu: " + updateError.message,
      };
    }

    const { data: proposal } = await supabaseServer
      .from("invoices")
      .select("invoice_number")
      .eq("id", proposalId)
      .single();

    await logActivity({
      userId,
      module: "invoice",
      action: "update",
      entityId: proposalId,
      entityName: proposal?.invoice_number ?? null,
      description: `Teklif "${proposal?.invoice_number ?? proposalId}" güncellendi (${Number(totalAmount).toLocaleString("tr-TR")} TRY)`,
      metadata: {
        proposal_type: proposalType,
        total_amount: totalAmount,
        line_items_count: lineItems.length,
      },
    });

    revalidatePath("/proposals");
    revalidatePath(`/proposals/${proposalId}`);

    return {
      success: true,
      message: "Teklif başarıyla güncellendi.",
      invoice_id: proposalId,
    };
  } catch (error) {
    console.error("Update proposal error:", error);
    return {
      success: false,
      message: `Beklenmeyen hata: ${(error as Error).message}`,
    };
  }
}

/* ═══════════════════════════════════════════
   UPDATE INVOICE ACTION
   ═══════════════════════════════════════════ */

export async function updateInvoiceAction(
  formData: FormData
): Promise<InvoiceActionState> {
  try {
    const userId = formData.get("user_id") as string;
    const invoiceId = formData.get("invoice_id") as string;
    const invoiceType = formData.get("invoice_type") as "sale" | "purchase";
    const issueDate = formData.get("issue_date") as string;
    const notes = formData.get("notes") as string;
    const contactId = formData.get("contact_id") as string;
    const lineItemsJson = formData.get("line_items") as string;

    if (!userId || !invoiceId || !invoiceType || !contactId) {
      return {
        success: false,
        message: "Eksik bilgi. Fatura ve cari bilgisi zorunludur.",
      };
    }

    const lineItems: InvoiceLineItem[] = JSON.parse(lineItemsJson || "[]");
    
    if (lineItems.length === 0) {
      return {
        success: false,
        message: "Faturada en az bir ürün olması zorunludur.",
      };
    }

    // Calculate totals
    let totalBeforeTax = 0;
    let totalTax = 0;
    const processedItems = lineItems.map((item) => {
      const lineBefore = item.quantity * item.unit_price;
      const lineVat = lineBefore * (item.vat_rate / 100);
      totalBeforeTax += lineBefore;
      totalTax += lineVat;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        line_total: lineBefore + lineVat,
      };
    });

    const totalAmount = totalBeforeTax + totalTax;

    // Delete old invoice items
    const { error: deleteItemsError } = await supabaseServer
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);

    if (deleteItemsError) {
      console.error("Error deleting invoice items:", deleteItemsError);
      return {
        success: false,
        message: "Fatura satırları silinirken hata oluştu.",
      };
    }

    // Insert new invoice items
    const invoiceItemsToInsert = processedItems.map((item) => ({
      invoice_id: invoiceId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      line_total: item.line_total,
    }));

    const { error: insertItemsError } = await supabaseServer
      .from("invoice_items")
      .insert(invoiceItemsToInsert);

    if (insertItemsError) {
      console.error("Error inserting invoice items:", insertItemsError);
      return {
        success: false,
        message: "Fatura satırları eklenirken hata oluştu.",
      };
    }

    // Mevcut faturanın exchange_rate'ini al ki TRY karşılığını güncelleyebilelim
    const { data: existingInv } = await supabaseServer
      .from("invoices")
      .select("exchange_rate")
      .eq("id", invoiceId)
      .single();
    const rate = Number(existingInv?.exchange_rate) || 1;

    // Update invoice
    const { error: updateError } = await supabaseServer
      .from("invoices")
      .update({
        contact_id: contactId,
        issue_date: issueDate,
        notes: notes || null,
        total_amount: totalAmount,
        tax_total: totalTax,
        total_amount_try: totalAmount * rate,
        tax_total_try: totalTax * rate,
        subtotal_try: (totalAmount - totalTax) * rate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Invoice update error:", updateError);
      return {
        success: false,
        message: "Fatura güncellenirken hata oluştu: " + updateError.message,
      };
    }

    const { data: invoiceRow } = await supabaseServer
      .from("invoices")
      .select("invoice_number")
      .eq("id", invoiceId)
      .single();

    await logActivity({
      userId,
      module: "invoice",
      action: "update",
      entityId: invoiceId,
      entityName: invoiceRow?.invoice_number ?? null,
      description: `Fatura "${invoiceRow?.invoice_number ?? invoiceId}" güncellendi (${invoiceType === "sale" ? "Satış" : "Alış"} - ${Number(totalAmount).toLocaleString("tr-TR")} TRY)`,
      metadata: {
        invoice_type: invoiceType,
        total_amount: totalAmount,
        line_items_count: lineItems.length,
      },
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);

    return {
      success: true,
      message: "Fatura başarıyla güncellendi.",
      invoice_id: invoiceId,
    };
  } catch (error) {
    console.error("Update invoice error:", error);
    return {
      success: false,
      message: `Beklenmeyen hata: ${(error as Error).message}`,
    };
  }
}
