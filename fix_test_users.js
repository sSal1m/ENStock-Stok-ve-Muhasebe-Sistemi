
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTestUsers() {
  console.log('Fixing company_name for test users...');
  const { data, error } = await supabase
    .from('profiles')
    .update({ company_name: 'ENStock Ltd. Şti.' })
    .is('company_name', null);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Test users updated.');
}

fixTestUsers();
