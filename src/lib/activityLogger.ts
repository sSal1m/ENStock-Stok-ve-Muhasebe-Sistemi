import { createClient } from "@supabase/supabase-js";

/**
 * Merkezi aktivite (audit) log yazarı.
 * Yalnızca server-side kullanılır; service role ile çalışır.
 * Log yazımı asla ana işlemi bozmaz — hata durumunda sadece console'a yazılır.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const logger = createClient(supabaseUrl, supabaseServiceKey);

export type ActivityModule = "product" | "contact" | "invoice";
export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "permanent_delete"
  | "stock_adjust"
  | "balance_change";

export interface LogActivityInput {
  userId: string;
  module: ActivityModule;
  action: ActivityAction;
  entityId?: string | null;
  entityName?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ActorInfo {
  email: string | null;
  full_name: string | null;
  company_name: string | null;
}

async function fetchActorInfo(userId: string): Promise<ActorInfo> {
  try {
    const [{ data: profile }, { data: authData }] = await Promise.all([
      logger
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", userId)
        .single(),
      logger.auth.admin.getUserById(userId),
    ]);

    return {
      email: authData?.user?.email ?? null,
      full_name: profile?.full_name ?? null,
      company_name: profile?.company_name ?? null,
    };
  } catch {
    return { email: null, full_name: null, company_name: null };
  }
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  if (!input.userId) return;

  try {
    const actor = await fetchActorInfo(input.userId);

    const { error } = await logger.from("activity_logs").insert({
      user_id: input.userId,
      user_email: actor.email,
      user_name: actor.full_name,
      company_name: actor.company_name,
      module: input.module,
      action: input.action,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      description: input.description ?? null,
      metadata: input.metadata ?? null,
    });

    if (error) {
      console.error("[activityLogger] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[activityLogger] unexpected error:", err);
  }
}
