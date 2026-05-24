"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * useTeamContext Hook
 * 
 * Resolves the current user's team context by finding all profiles that share 
 * the same company_name. Returns the list of team member user IDs so that 
 * data queries can use `.in("user_id", teamUserIds)` instead of `.eq("user_id", singleId)`.
 * 
 * This allows invited team members to see the company's shared data (products, invoices, contacts, etc.)
 */
export function useTeamContext() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamUserIds, setTeamUserIds] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveTeam = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // 1. Get this user's profile to find their business_id
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("business_id, company_name")
        .eq("id", user.id)
        .single();

      const businessId = myProfile?.business_id;
      setCompanyName(myProfile?.company_name || null);

      if (businessId) {
        // 2. Fetch team IDs securely from server action (bypasses RLS)
        const { getTeamIdsSecure } = await import("@/app/(dashboard)/teamActions");
        const ids = await getTeamIdsSecure(user.id);
        setTeamUserIds(ids);
      } else {
        // No company set, only show own data
        setTeamUserIds([user.id]);
      }
    } catch (err) {
      console.error("Team context resolution error:", err);
      // Fallback: won't break
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveTeam();
  }, [resolveTeam]);

  return {
    currentUserId,
    teamUserIds,
    companyName,
    loading,
    /**
     * Helper: Use this to build Supabase queries.
     * If the team has multiple members, uses .in(), otherwise .eq() for efficiency.
     */
    applyTeamFilter: (query: any, column = "user_id") => {
      if (teamUserIds.length <= 1) {
        return query.eq(column, teamUserIds[0] || currentUserId);
      }
      return query.in(column, teamUserIds);
    },
  };
}
