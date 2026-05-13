"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function inviteUserAction(formData: { email: string; full_name: string; role: string; company_name: string }) {
  if (!supabaseServiceKey) {
    return { success: false, message: "Server configuration missing (Service Role Key)." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. Generate Invite Link instead of relying on unreliable default SMTP emails
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: formData.email,
      options: {
        data: {
          full_name: formData.full_name,
          role: formData.role
        },
      }
    });

    if (linkError) throw linkError;

    const authData = { user: linkData.user };
    const inviteUrl = linkData.properties?.action_link;

    // 2. Create profile entry so they show up in the list
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: authData.user.id,
          full_name: formData.full_name,
          role: formData.role,
          company_name: formData.company_name,
          created_at: new Date().toISOString()
        });
      
      if (profileError) console.warn("Profile creation warning:", profileError);
    }

    revalidatePath("/settings/users");
    return { success: true, inviteUrl };
  } catch (error: any) {
    console.error("Invite Error:", error);
    return { success: false, message: error.message || "Davet gönderilirken bir hata oluştu." };
  }
}
