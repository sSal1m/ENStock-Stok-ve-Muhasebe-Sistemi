"use server";

import { fetchTeamScopedData } from "@/app/(dashboard)/teamActions";

export interface ContactVolume {
  contact_id: string;
  contact_name: string;
  total_volume: number;
}

export interface CategoryVolume {
  category_name: string;
  amount: number;
}

export interface MonthlyTrend {
  month: string;
  month_name: string;
  income: number;
  expense: number;
}

export interface DashboardSummaryResponse {
  total_income: number;     // TRY
  total_expense: number;    // TRY
  total_stock: number;
  top_contacts: ContactVolume[];        // total_volume TRY
  income_by_category: CategoryVolume[]; // amount TRY
  expense_by_category: CategoryVolume[];
  monthly_trend: MonthlyTrend[];        // income/expense TRY
}

const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/**
 * Currency-aware dashboard özeti. Faturalar farklı para birimlerinde olabilir;
 * her birini exchange_rate ile TRY'ye normalize edip topluyoruz. Eski
 * `get_dashboard_summary` RPC'si currency-blind toplama yapıyordu — bu
 * yüzden client tarafından yapılması tercih edildi.
 */
export async function fetchDashboardSummary(userId: string): Promise<DashboardSummaryResponse | null> {
  try {
    // 1, 2, 3, 4) Tüm bağımsız veritabanı sorgularını PARALEL (Promise.all) olarak çalıştırarak hızı maksimuma çıkarıyoruz!
    const [invoicesRes, productsRes, contactsRes, itemsRes] = await Promise.all([
      // 1) Tüm aktif faturalar (draft hariç) — currency ve exchange_rate ile
      fetchTeamScopedData(
        userId,
        "invoices",
        "id, total_amount, currency, exchange_rate, type, status, issue_date, contact_id",
        {
          excludeDeleted: true,
          additionalFilters: [{ column: "status", operator: "neq", value: "draft" }]
        }
      ),
      // 2) Stok adedi
      fetchTeamScopedData(
        userId,
        "products",
        "id",
        { excludeDeleted: true, countOnly: true }
      ),
      // 3) Tüm takım kapsamındaki contacts (hızlı isim eşleme için)
      fetchTeamScopedData(
        userId,
        "contacts",
        "id, name",
        { excludeDeleted: false }
      ),
      // 4) Fatura kalemleri + ürün kategorileri (kategori bazlı analiz için)
      fetchTeamScopedData(
        userId,
        "invoice_items",
        "invoice_id, quantity, unit_price, products(name, categories(name)), invoices!inner(user_id, deleted_at)",
        {
          teamFilterColumn: 'invoices.user_id',
          additionalFilters: [
            { column: 'invoices.deleted_at', operator: 'is', value: null }
          ]
        }
      )
    ]);

    const invoices = invoicesRes.data ?? [];
    const totalStockCount = productsRes.count ?? 0;
    const contactsData = contactsRes.data ?? [];
    const rawItems = itemsRes.data ?? [];

    // Contact isim haritası oluşturma
    const contactMap = new Map<string, string>();
    contactsData.forEach((c: any) => {
      contactMap.set(c.id, c.name);
    });

    // Fatura kalemlerini filtreleme ve gruplama (Sadece aktif faturalara ait olanları eşle) - O(N) zaman karmaşıklığı ile optimize edildi!
    const activeInvoiceIds = new Set(invoices.map((inv: any) => inv.id));
    const items = rawItems.filter((it: any) => activeInvoiceIds.has(it.invoice_id));

    const itemsByInvoice = new Map<string, any[]>();
    items.forEach((it: any) => {
      const arr = itemsByInvoice.get(it.invoice_id) ?? [];
      arr.push(it);
      itemsByInvoice.set(it.invoice_id, arr);
    });

    // 5) Agregasyonlar (hepsi TRY)
    let totalIncome = 0;
    let totalExpense = 0;
    const contactVolumes = new Map<string, number>(); // contactId → TRY volume
    const incomeByCategory = new Map<string, number>();
    const expenseByCategory = new Map<string, number>();
    const monthMap = new Map<string, { income: number; expense: number; sortKey: string }>();

    (invoices ?? []).forEach((inv: any) => {
      const rate = Number(inv.exchange_rate) || 1;
      const totalTry = (Number(inv.total_amount) || 0) * rate;

      if (inv.type === "sale") {
        totalIncome += totalTry;
      } else {
        totalExpense += totalTry;
      }

      if (inv.contact_id) {
        contactVolumes.set(inv.contact_id, (contactVolumes.get(inv.contact_id) ?? 0) + totalTry);
      }

      // Aylık trend (son 6 ay)
      if (inv.issue_date) {
        const d = new Date(inv.issue_date);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthName = TR_MONTHS[d.getMonth()];
        const current = monthMap.get(key) ?? { income: 0, expense: 0, sortKey };
        if (inv.type === "sale") current.income += totalTry;
        else current.expense += totalTry;
        current.sortKey = sortKey;
        monthMap.set(key, current);
        // monthName'i sıralama için saklamayız, render sırasında çekeriz
        (current as any).monthName = monthName;
      }

      // Kategori bazlı dağılım — fatura kalemleri × ürün kategorisi
      const invItems = itemsByInvoice.get(inv.id) ?? [];
      invItems.forEach((it: any) => {
        const lineTry = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * rate;
        const product = Array.isArray(it.products) ? it.products[0] : it.products;
        const category = Array.isArray(product?.categories) ? product.categories[0] : product?.categories;
        const categoryName = category?.name ?? product?.name ?? "Diğer";
        if (inv.type === "sale") {
          incomeByCategory.set(categoryName, (incomeByCategory.get(categoryName) ?? 0) + lineTry);
        } else {
          expenseByCategory.set(categoryName, (expenseByCategory.get(categoryName) ?? 0) + lineTry);
        }
      });
    });

    // Top 5 cariler
    const topContacts: ContactVolume[] = Array.from(contactVolumes.entries())
      .map(([contactId, vol]) => ({
        contact_id: contactId,
        contact_name: contactMap.get(contactId) ?? "Bilinmeyen",
        total_volume: vol,
      }))
      .sort((a, b) => b.total_volume - a.total_volume)
      .slice(0, 5);

    // Income/Expense by category
    const incomeByCategoryArr: CategoryVolume[] = Array.from(incomeByCategory.entries())
      .map(([category_name, amount]) => ({ category_name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const expenseByCategoryArr: CategoryVolume[] = Array.from(expenseByCategory.entries())
      .map(([category_name, amount]) => ({ category_name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // Aylık trend — son 6 ay (eksik ayları doldur)
    const monthlyTrend: MonthlyTrend[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const entry = monthMap.get(key);
      monthlyTrend.push({
        month: key,
        month_name: TR_MONTHS[d.getMonth()],
        income: entry?.income ?? 0,
        expense: entry?.expense ?? 0,
      });
    }

    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      total_stock: totalStockCount ?? 0,
      top_contacts: topContacts,
      income_by_category: incomeByCategoryArr,
      expense_by_category: expenseByCategoryArr,
      monthly_trend: monthlyTrend,
    };
  } catch (err) {
    console.error("Dashboard özeti getirilemedi:", err);
    return null;
  }
}
