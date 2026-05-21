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

async function makeSukruAdmin() {
  console.log('Setting Şükrü FINDIK and sukru as admin...');
  
  // 1. Update Şükrü FINDIK
  const res1 = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', '66652908-8458-4582-85ba-76d5996ddc57');
    
  if (res1.error) {
    console.error('Error updating Şükrü FINDIK:', res1.error);
  } else {
    console.log('Şükrü FINDIK is now admin!');
  }

  // 2. Update sukru
  const res2 = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', 'a0c85673-c532-41c7-a473-1e8c41a38330');

  if (res2.error) {
    console.error('Error updating sukru:', res2.error);
  } else {
    console.log('sukru is now admin!');
  }
}

makeSukruAdmin();
