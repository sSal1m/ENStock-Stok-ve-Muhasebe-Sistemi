
"use server";

import { createClient } from "@supabase/supabase-js";
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type InvitationInput = {
  email: string;
  role: string;
};

type InvitationResult =
  | { success: true; inviteUrl?: string }
  | { success: false; message: string };

function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function sendInvitationEmail(params: {
  email: string;
  role: string;
  otpCode: string;
  businessId: string;
}) {
  // TODO: Replace this block with your email provider integration (Resend, Nodemailer, etc.).
  // Example payload should include the otpCode and any onboarding instructions.
  console.log("INVITATION OTP (TEST MODE):", {
    email: params.email,
    role: params.role,
    businessId: params.businessId,
    otpCode: params.otpCode,
  });
}

export async function createInvitationAction(input: InvitationInput): Promise<InvitationResult> {
  console.log("[Invite] Action started", { email: input.email, role: input.role });
  if (!supabaseServiceKey || !supabaseUrl || !supabaseAnonKey) {
    return { success: false, message: "Server configuration is missing." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const supabaseServer = await createSupabaseServerClient();

  try {
    const { data: userData, error: userError } = await supabaseServer.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, message: "Not authenticated." };
    }

    console.log("[Invite] Authenticated user id:", userData.user.id);

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("business_id, role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !adminProfile) {
      return { success: false, message: "Admin profile not found." };
    }

    console.log("[Invite] Admin business_id:", adminProfile.business_id);

    if (adminProfile.role !== "admin") {
      return { success: false, message: "Only admins can invite users." };
    }

    const email = (input.email || "").trim().toLowerCase();
    const role = (input.role || "").trim().toLowerCase();

    if (!email || !role) {
      return { success: false, message: "Email and role are required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: "Invalid email address." };
    }

    if (!adminProfile.business_id) {
      throw new Error("Admin profile is missing a business_id!");
    }

    const otpCode = generateOtpCode();

    const { error: deleteError } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("email", email);

    if (deleteError) {
      console.error("❌ SUPABASE DELETE ERROR:", deleteError);
      throw new Error(deleteError.message);
    }

    console.log("[Invite] Inserting invitation:", {
      email,
      role,
      business_id: adminProfile.business_id,
    });

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("invitations")
      .insert({
      email,
      role,
      business_id: adminProfile.business_id,
      otp_code: otpCode,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ SUPABASE INSERT ERROR:", insertError);
      throw new Error(insertError.message);
    }

    if (!insertData) {
      console.error("❌ SUPABASE INSERT ERROR: no data returned");
      throw new Error("Insert returned no data.");
    }

    console.log("🔥 [TEST OTP] Code for " + email + " is: " + otpCode);

    await sendInvitationEmail({
      email,
      role,
      otpCode,
      businessId: adminProfile.business_id,
    });

    revalidatePath("/settings/users");
    return { success: true };
  } catch (error: any) {
    console.error("Create Invitation Error:", error);
    return { success: false, message: error.message || "Unexpected server error." };
  }
}

export async function inviteUserAction(formData: {
  email: string;
  role: string;
}): Promise<InvitationResult> {
  return createInvitationAction({
    email: formData.email,
    role: formData.role,
  });
}
