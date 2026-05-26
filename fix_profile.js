
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

async function fixKarssProfile() {
  console.log('Updating profile for karss...');
  const { data, error } = await supabase
    .from('profiles')
    .update({ company_name: 'ENStock Ltd. Şti.' })
    .eq('id', 'cc889df6-57f6-47bf-a636-8a9443c404c7');
  
  if (error) {
    console.error('Error updating profile:', error);
    return;
  }
  
  console.log('Profile updated successfully.');
}

fixKarssProfile();
