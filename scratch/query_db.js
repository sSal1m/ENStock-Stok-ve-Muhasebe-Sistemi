const fs = require('fs');
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  if (uError) {
    console.error("Error fetching users:", uError);
    return;
  }

  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error("Error fetching profiles:", pError);
    return;
  }

  console.log("--- USERS AND PROFILES COMPARISON ---");
  users.forEach(u => {
    const profile = profiles.find(p => p.id === u.id);
    console.log({
      id: u.id,
      email: u.email,
      auth_role: u.role,
      auth_metadata_role: u.user_metadata?.role,
      profile_name: profile ? profile.full_name : 'No profile',
      profile_role: profile ? profile.role : 'No profile'
    });
  });
}

check();
