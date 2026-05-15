
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function inviteUserAction(formData: { email: string; full_name: string; role: string; company_name: string }) {
  console.log("INVITE ACTION (ROBUST) INPUT:", formData);
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
    // 1. First, check if user already exists in Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    
    let targetUser = users.find(u => u.email === formData.email);

    if (!targetUser) {
      // 2. Create the user manually if they don't exist
      // We set a random password because they will reset it via the link
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        email_confirm: true,
        user_metadata: {
          full_name: formData.full_name,
          role: formData.role
        }
      });

      if (createError) throw createError;
      targetUser = newUser.user;
    }

    if (!targetUser) throw new Error("Kullanıcı oluşturulamadı.");

    // 3. Generate a recovery link (this acts as an "invite" to set their password)
    let finalLinkData = null;
    const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: formData.email
    });

    if (recoveryError) {
      console.warn("Recovery link failed, trying magiclink...", recoveryError);
      const { data: magicData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: formData.email
      });
      
      if (magicError) throw new Error("Supabase Auth sistemi (SMTP) şu an tamamen kapalı. Lütfen Supabase Dashboard > Auth > SMTP ayarlarını kontrol edin veya özel bir SMTP (SendGrid vb.) bağlayın.");
      finalLinkData = magicData;
    } else {
      finalLinkData = recoveryData;
    }

    const inviteUrl = finalLinkData?.properties?.action_link;

    // 4. Create/Update profile entry
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: targetUser.id,
        full_name: formData.full_name,
        role: formData.role,
        company_name: formData.company_name,
        status: 'pending',
        updated_at: new Date().toISOString()
      });
    
    if (profileError) console.warn("Profile sync warning:", profileError);

    revalidatePath("/settings/users");
    return { success: true, inviteUrl };
  } catch (error: any) {
    console.error("Robust Invite Error:", error);
    return { success: false, message: error.message || "İşlem sırasında bir hata oluştu." };
  }
}
