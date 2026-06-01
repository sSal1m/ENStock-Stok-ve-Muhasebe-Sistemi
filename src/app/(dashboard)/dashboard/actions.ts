"use server";

import { fetchTeamScopedData } from "@/app/(dashboard)/teamActions";
import { getRecentActivityLogs } from "@/app/(dashboard)/activity-log/actions";

export async function getDashboardDataServer(userId: string) {
  try {
    const [
      productsRes,
      revenueRes,
      activitiesRes,
      contactsRes,
      invoicesDetailsRes,
      logsRes,
    ] = await Promise.all([
      // Products
      fetchTeamScopedData(
        userId,
        "products",
        "id, name, stock_quantity, critical_limit, sale_price, currency, sale_price_in_currency",
        { excludeDeleted: true }
      ),

      // Invoices (revenue)
      fetchTeamScopedData(
        userId,
        "invoices",
        "id, total_amount, currency, exchange_rate, type, issue_date",
        { excludeDeleted: true }
      ),

      // Inventory Logs
      fetchTeamScopedData(
        userId,
        "inventory_logs",
        "id, action_type, quantity_change, created_at, products(name)",
        { orderBy: "created_at", orderAscending: false, limit: 5 }
      ),

      // Contacts (vendors)
      fetchTeamScopedData(
        userId,
        "contacts",
        "id, name, type",
        { excludeDeleted: true, limit: 10 }
      ),

      // Invoice Items (chart data)
      fetchTeamScopedData(
        userId,
        "invoice_items",
        "quantity, unit_price, invoice_id, product_id, invoices!inner(issue_date, type, currency, exchange_rate, deleted_at, user_id), products(purchase_price)",
        {
          teamFilterColumn: "invoices.user_id",
          additionalFilters: [
            { column: "invoices.deleted_at", operator: "is", value: null },
            {
              column: "invoices.issue_date",
              operator: "gte",
              value: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            },
          ],
        }
      ),

      // Activity logs
      getRecentActivityLogs(userId, 6),
    ]);

    return {
      success: true,
      data: {
        productsRes,
        revenueRes,
        activitiesRes,
        contactsRes,
        invoicesDetailsRes,
        logsRes,
      },
    };
  } catch (error: any) {
    console.error("Error in getDashboardDataServer:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch dashboard data.",
    };
  }
}
