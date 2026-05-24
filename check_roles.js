const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) env[key.trim()] = values.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('role');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const roles = new Set();
  data.forEach(r => roles.add(r.role));
  console.log('Existing roles in DB:', Array.from(roles));
}

checkRoles();
