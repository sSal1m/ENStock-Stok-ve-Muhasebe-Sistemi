
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testInvite() {
  const testEmail = `test-invite-${Date.now()}@example.com`;
  console.log(`Sending invite to: ${testEmail}`);
  
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(testEmail, {
    data: {
      full_name: 'Debug User',
      role: 'staff'
    }
  });

  if (error) {
    console.error('Invite Error:', error);
  } else {
    console.log('Invite Success Data:', JSON.stringify(data, null, 2));
  }
}

testInvite();
