"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Use service_role to bypass RLS and find all team members safely
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/* ═══════════════════════════════════════════
   TEAM ID RESOLUTION
   ═══════════════════════════════════════════ */

function applyTeamFilterServer(query: any, teamIds: string[], column = "user_id") {
  if (teamIds.length <= 1) {
    return query.eq(column, teamIds[0]);
  }
  return query.in(column, teamIds);
}

/**
 * Resolves the team member IDs securely from the server.
 * Bypasses RLS to ensure we can find all users with the same business_id.
 */
export async function getTeamIdsSecure(userId: string): Promise<string[]> {
  try {
    const { data: myProfile } = await supabaseAdmin
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .single();

    const businessId = myProfile?.business_id;
    if (!businessId) return [userId];

    const { data: teamProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("business_id", businessId);

    if (teamProfiles && teamProfiles.length > 0) {
      return teamProfiles.map((p) => p.id);
    }

    return [userId];
  } catch (error) {
    console.error("Error in getTeamIdsSecure:", error);
    return [userId];
  }
}

/* ═══════════════════════════════════════════
   INVENTORY DATA (bypasses RLS)
   ═══════════════════════════════════════════ */

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  currency: string;
  purchase_price_in_currency: number;
  sale_price_in_currency: number;
  stock_quantity: number;
  critical_limit: number;
  categories: { name: string }[] | { name: string } | null;
}

export interface InventoryCategory {
  id: string;
  name: string;
}

export interface InventoryData {
  products: InventoryProduct[];
  categories: InventoryCategory[];
  invoiceCount: number;
}

export async function fetchInventoryData(userId: string): Promise<InventoryData> {
  const teamIds = await getTeamIdsSecure(userId);

  // 1. Categories
  const { data: categoryData } = await applyTeamFilterServer(
    supabaseAdmin.from("categories").select("id, name"),
    teamIds
  ).order("name");

  // 2. Products (exclude trash)
  const { data: productData } = await applyTeamFilterServer(
    supabaseAdmin
      .from("products")
      .select("id, sku, name, purchase_price, sale_price, currency, purchase_price_in_currency, sale_price_in_currency, stock_quantity, critical_limit, categories(name)")
      .is("deleted_at", null),
    teamIds
  ).order("name");

  // 3. Invoice count
  const { count: invoiceCount } = await applyTeamFilterServer(
    supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    teamIds
  );

  return {
    products: (productData ?? []) as InventoryProduct[],
    categories: (categoryData ?? []) as InventoryCategory[],
    invoiceCount: invoiceCount ?? 0,
  };
}

/* ═══════════════════════════════════════════
   GENERIC TEAM-SCOPED QUERIES (bypasses RLS)
   For invoices, contacts, proposals, dashboard etc.
   ═══════════════════════════════════════════ */

export async function fetchTeamScopedData(
  userId: string,
  table: string,
  selectFields: string,
  options?: {
    excludeDeleted?: boolean;
    orderBy?: string;
    orderAscending?: boolean;
    limit?: number;
    countOnly?: boolean;
    additionalFilters?: Array<{ column: string; operator: string; value: any }>;
    teamFilterColumn?: string;
  }
): Promise<{ data: any[]; count: number | null }> {
  const teamIds = await getTeamIdsSecure(userId);

  let query = supabaseAdmin.from(table).select(
    selectFields,
    options?.countOnly ? { count: "exact", head: true } : { count: "exact" }
  );

  if (options?.excludeDeleted) {
    query = query.is("deleted_at", null);
  }

  query = applyTeamFilterServer(query, teamIds, options?.teamFilterColumn ?? "user_id");

  if (options?.additionalFilters) {
    for (const f of options.additionalFilters) {
      if (f.operator === "eq") query = query.eq(f.column, f.value);
      else if (f.operator === "ilike") query = query.ilike(f.column, f.value);
      else if (f.operator === "gte") query = query.gte(f.column, f.value);
      else if (f.operator === "lte") query = query.lte(f.column, f.value);
      else if (f.operator === "is") query = query.is(f.column, f.value);
      else if (f.operator === "not") query = query.not(f.column, "is", f.value);
    }
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.orderAscending ?? true });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error(`[fetchTeamScopedData] Error on table "${table}":`, error);
    return { data: [], count: 0 };
  }

  return { data: data ?? [], count };
}
