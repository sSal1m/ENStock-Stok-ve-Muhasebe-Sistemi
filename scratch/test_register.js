const fs = require('fs');

// We will load registerInvitedUserAction by requiring it from the project, 
// but since it's a Next.js server action file and uses ES imports/Next.js features,
// it might not run directly in Node.
// So let's write a standalone script that duplicates the exact database operations of registerInvitedUserAction
// for the invitation '25sehasalim@gmail.com' and prints all logs.

const { createClient } = require('c:/Users/seha/Desktop/yazilimmuhproje-main/node_modules/@supabase/supabase-js');

// Parse .env.local manually
const envPath = 'c:/Users/seha/Desktop/yazilimmuhproje-main/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRegister() {
  const email = '25sehasalim@gmail.com';
  const otpCode = '784919';
  const full_name = 'Seha Salim';
  const password = 'Password123!';

  try {
    console.log("1. Fetching invitation...");
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('invitations')
      .select('id, otp_code, is_accepted, expires_at, business_id, role')
      .eq('email', email)
      .single();

    if (fetchError || !invitation) {
      console.error("Fetch error:", fetchError);
      return;
    }
    console.log("Invitation details:", invitation);

    console.log("2. Creating user in auth...");
    // Delete existing user if exists to avoid conflicts
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      console.log("Deleting existing test user...");
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      // Wait a bit
      await new Promise(r => setTimeout(r, 1000));
    }

    const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        business_id: invitation.business_id ?? null,
        role: invitation.role ?? 'employee',
      },
    });

    if (createUserError) {
      console.error("Create user error:", createUserError);
      return;
    }

    const user = createUserData.user;
    console.log("User created in auth successfully. ID:", user.id);

    console.log("3. Marking invitation as accepted...");
    await supabaseAdmin
      .from('invitations')
      .update({ is_accepted: true })
      .eq('id', invitation.id);

    console.log("4. Fetching company name...");
    const { data: companyProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_name')
      .eq('business_id', invitation.business_id)
      .not('company_name', 'is', null)
      .limit(1)
      .single();

    const companyName = companyProfile?.company_name || null;
    console.log("Company name:", companyName);

    console.log("5. Updating profiles table...");
    const { data: updateResult, error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        business_id: invitation.business_id,
        company_name: companyName,
        role: invitation.role ?? 'staff',
        full_name: full_name.trim(),
      })
      .eq('id', user.id)
      .select();

    if (profileUpdateError) {
      console.error("❌ Profile update error:", profileUpdateError);
    } else {
      console.log("✅ Profile update succeeded! Result:", updateResult);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

testRegister();
