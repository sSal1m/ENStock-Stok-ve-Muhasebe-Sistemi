import { supabase } from "@/lib/supabaseClient";

/**
 * Resolves the team member IDs for data sharing.
 * All team members with the same company_name can see each other's data.
 * Returns an array of user IDs that should be used in queries.
 */
export async function resolveTeamIds(userId: string): Promise<string[]> {
  try {
    // 1. Get this user's company
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", userId)
      .single();

    const company = myProfile?.company_name;
    if (!company) return [userId];

    // 2. Find all team members with the same company
    const { data: teamProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_name", company);

    if (teamProfiles && teamProfiles.length > 0) {
      return teamProfiles.map((p) => p.id);
    }

    return [userId];
  } catch {
    return [userId];
  }
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
