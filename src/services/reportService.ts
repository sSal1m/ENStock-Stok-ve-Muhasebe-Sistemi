import { supabase } from "@/lib/supabaseClient";

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
  total_income: number;
  total_expense: number;
  total_stock: number;
  top_contacts: ContactVolume[];
  income_by_category: CategoryVolume[];
  expense_by_category: CategoryVolume[];
  monthly_trend: MonthlyTrend[];
}

export async function fetchDashboardSummary(userId: string): Promise<DashboardSummaryResponse | null> {
  const { data, error } = await supabase.rpc("get_dashboard_summary", { p_user_id: userId });

  if (error) {
    console.error("Dashboard özeti getirilemedi (RPC Hatası):", error);
    return null;
  }

  return data as unknown as DashboardSummaryResponse;
}
