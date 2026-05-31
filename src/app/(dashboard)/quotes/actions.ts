"use server";

import { createClient } from "@supabase/supabase-js";
import { getTeamIdsSecure } from "@/app/(dashboard)/teamActions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function fetchTeamQuotes(userId: string) {
  try {
    const teamIds = await getTeamIdsSecure(userId);

    // Fetch quotes
    let query = supabaseAdmin
      .from("quotes")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (teamIds.length <= 1) {
      query = query.eq("user_id", teamIds[0]);
    } else {
      query = query.in("user_id", teamIds);
    }

    const { data: quotesData, error: quotesError } = await query;

    if (quotesError) {
      console.error("Error fetching team quotes:", quotesError);
      return { success: false, data: [] };
    }

    // Fetch contacts for these quotes
    const normalizedQuotes = quotesData || [];
    const contactIds = [...new Set(normalizedQuotes.map((q) => q.contact_id).filter(Boolean))];

    let contactsMap: Record<string, string> = {};

    if (contactIds.length > 0) {
      const { data: contactsData, error: contactsError } = await supabaseAdmin
        .from("contacts")
        .select("id, name")
        .in("id", contactIds);

      if (!contactsError && contactsData) {
        contactsData.forEach((c: any) => {
          contactsMap[c.id] = c.name;
        });
      }
    }

    return { success: true, quotes: normalizedQuotes, contacts: contactsMap };
  } catch (error) {
    console.error("Exception in fetchTeamQuotes:", error);
    return { success: false, data: [], error: String(error) };
  }
}

export async function fetchTeamQuoteById(userId: string, quoteId: string) {
  try {
    const teamIds = await getTeamIdsSecure(userId);

    const { data: quoteData, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select(`*, contacts (name, tax_number, tax_office, address)`)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quoteData) {
      console.error("Error fetching quote by id:", quoteError);
      return { success: false };
    }

    if (!teamIds.includes(quoteData.user_id)) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: itemsData, error: itemsError } = await supabaseAdmin
      .from("quote_items")
      .select("*, products(name)")
      .eq("quote_id", quoteId);

    return { 
      success: true, 
      quote: quoteData, 
      items: itemsError ? [] : itemsData || [] 
    };

  } catch (error) {
    console.error("Exception in fetchTeamQuoteById:", error);
    return { success: false, error: String(error) };
  }
}
