import { supabase } from "@/lib/supabaseClient";

import { getTeamIdsSecure } from "@/app/(dashboard)/teamActions";

/**
 * Resolves the team member IDs for data sharing.
 * Uses a server action to bypass RLS so we can accurately find all team members.
 */
export async function resolveTeamIds(userId: string): Promise<string[]> {
  return await getTeamIdsSecure(userId);
}

/**
 * Applies team filtering to a Supabase query.
 * Uses .in() for multiple team members, or .eq() for a single user (more efficient).
 */
export function applyTeamFilter(query: any, teamIds: string[], column = "user_id") {
  if (teamIds.length <= 1) {
    return query.eq(column, teamIds[0]);
  }
  return query.in(column, teamIds);
}
