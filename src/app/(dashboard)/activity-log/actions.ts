"use server";

import { createClient } from "@supabase/supabase-js";
import { logActivity, type ActivityAction, type ActivityModule } from "@/lib/activityLogger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

/* ═══════════════════════════════════════════
   Client'tan log yazımı için ince server action.
   Inventory new/edit gibi client component'lar
   bu action üzerinden audit log üretir.
   ═══════════════════════════════════════════ */

export async function logActivityAction(input: {
  userId: string;
  module: ActivityModule;
  action: ActivityAction;
  entityId?: string | null;
  entityName?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await logActivity(input);
  return { success: true };
}

/* ═══════════════════════════════════════════
   Team resolution (server-side)
   ═══════════════════════════════════════════ */

async function resolveCompanyName(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseServer
      .from("profiles")
      .select("company_name")
      .eq("id", userId)
      .single();
    return data?.company_name ?? null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════
   Aktivite loglarını okuma
   ═══════════════════════════════════════════ */

export interface ActivityLogRecord {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  company_name: string | null;
  module: ActivityModule;
  action: ActivityAction;
  entity_id: string | null;
  entity_name: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ListActivityLogsParams {
  userId: string;
  module?: ActivityModule | "all";
  action?: ActivityAction | "all";
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function listActivityLogs(
  params: ListActivityLogsParams
): Promise<{ success: boolean; data: ActivityLogRecord[]; total: number; message?: string }> {
  try {
    const company = await resolveCompanyName(params.userId);

    let query = supabaseServer
      .from("activity_logs")
      .select("*", { count: "exact" });

    if (company) {
      query = query.eq("company_name", company);
    } else {
      query = query.eq("user_id", params.userId);
    }

    if (params.module && params.module !== "all") {
      query = query.eq("module", params.module);
    }
    if (params.action && params.action !== "all") {
      query = query.eq("action", params.action);
    }
    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(
        `entity_name.ilike.%${s}%,description.ilike.%${s}%,user_name.ilike.%${s}%,user_email.ilike.%${s}%`
      );
    }
    if (params.startDate) {
      query = query.gte("created_at", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("created_at", params.endDate);
    }

    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("listActivityLogs error:", error);
      return { success: false, data: [], total: 0, message: error.message };
    }

    return {
      success: true,
      data: (data ?? []) as ActivityLogRecord[],
      total: count ?? 0,
    };
  } catch (err) {
    console.error("Unexpected listActivityLogs error:", err);
    return { success: false, data: [], total: 0, message: "Loglar alınamadı." };
  }
}

export async function getRecentActivityLogs(userId: string, limit = 8) {
  const result = await listActivityLogs({ userId, limit });
  return result;
}
