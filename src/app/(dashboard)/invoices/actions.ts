"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

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
  status?: "draft" | "pending";  // ✅ draft veya pending statüsng statüsü
  invoice_id?: string;  // ✅ NEW: draft faturayı update etmek için
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

  const { data, error } = await supabaseServer
    .from("contacts")
    .select("id, name, tax_number, tax_office, type")
    .eq("user_id", userId)
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

  const { data, error } = await supabaseServer
    .from("products")
    .select("id, name, sku, stock_quantity, sale_price, purchase_price")
    .eq("user_id", userId)
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
    // Try to get the last invoice number by counting invoices of this type for this user
    const { data: countData, error: countError } = await supabaseServer
      .from("invoices")
      .select("id", { count: "exact" })
      .eq("user_id", userId);

    if (countError) {
      console.error("Error counting invoices:", countError);
      // Fallback: just use a timestamp-based number
      return Math.floor(Date.now() % 1000000);
    }

    // Next invoice number is count + 1
    const nextNumber = (countData?.length || 0) + 1;
    return nextNumber;
  } catch (err) {
    console.error("Unexpected error in getNextInvoiceNumber:", err);
    // Fallback: use timestamp
    return Math.floor(Date.now() % 1000000);
  }
}

/* ═══════════════════════════════════════════
   CREATE INVOICE (Main Server Action)
   With atomic transaction-like behavior
   ═══════════════════════════════════════════ */

export async function createInvoiceAction(request: CreateInvoiceRequest): Promise<InvoiceActionState> {
  const { user_id, contact_id, invoice_type, issue_date, notes, line_items, status = "draft", invoice_id } = request;

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

    if (invoice_id) {
      // ✅ Update existing draft invoice
      const { data: updatedInvoice, error: updateError } = await supabaseServer
        .from("invoices")
        .update({
          contact_id,
          type: dbInvoiceType,
          issue_date,
          subtotal,
          tax_total: vatTotal,
          total_amount: totalAmount,
          notes: notes || null,
          status: status,
        })
        .eq("id", invoice_id)
        .select()
        .single();

      if (updateError || !updatedInvoice) {
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
      const invoiceNumber = await getNextInvoiceNumber(user_id, invoice_type);
      if (!invoiceNumber) {
        return {
          success: false,
          message: "Fatura numarası oluşturulamadı",
        };
      }

      const { data: createdInvoice, error: invoiceError } = await supabaseServer
        .from("invoices")
        .insert([
          {
            user_id,
            contact_id,
            type: dbInvoiceType,
            invoice_number: invoiceNumber,
            issue_date,
            subtotal,
            tax_total: vatTotal,
            total_amount: totalAmount,
            notes: notes || null,
            status: status,
          },
        ])
        .select()
        .single();

      if (invoiceError || !createdInvoice) {
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
      console.error("❌ [STEP 2] Fatura satırları oluştururken hata:", {
        message: itemsError?.message,
        code: itemsError?.code,
        details: itemsError?.details,
        invoiceId: invoiceIdToUse,
        itemCount: invoiceItemsToInsert.length,
      });
      // Only rollback if creating new invoice
      if (!invoice_id) {
        await supabaseServer.from("invoices").delete().eq("id", invoiceIdToUse);
      }
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
        const amount = Number(totalAmount);
        
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
      // STEP 6: UPDATE CONTACT BALANCE
      // ═══════════════════════════════════════════
      if (shouldProcessStock) {  // ✅ Only if transitioning from draft->paid
        const balanceChange = invoice_type === "sales" ? totalAmount : -totalAmount;
        
        const { data: currentContact, error: fetchError } = await supabaseServer
          .from("contacts")
          .select("current_balance")
          .eq("id", contact_id)
          .single();

        if (fetchError) {
          console.error("❌ [STEP 6] Error fetching contact balance:", fetchError);
        } else if (currentContact) {
          const newBalance = Number(currentContact.current_balance || 0) + balanceChange;
          
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
            console.log("✅ [STEP 6] Contact balance updated:", {
              contact_id,
              newBalance,
              change: balanceChange,
            });
          }
        }
      } else {
        console.log("📝 [STEP 6 SKIP] Fatura zaten kesikmiş, bakiye tekrar güncellemiyor");
      }
    } else {
      // ✅ Draft statüsü: Sadece fatura ve kalemler kaydedilir
      console.log("📝 [DRAFT] Invoice saved as draft - no stock or balance changes");
    }

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
