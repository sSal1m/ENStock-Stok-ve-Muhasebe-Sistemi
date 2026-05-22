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

async function testRoles() {
  const rolesToTest = ['admin', 'accounting', 'warehouse', 'sales', 'staff', 'personnel', 'personel'];
  
  for (const role of rolesToTest) {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // Dummy UUID
      
    if (error && error.message.includes('invalid input value for enum user_role')) {
      console.log(`❌ Invalid role: ${role}`);
    } else {
      console.log(`✅ Valid role: ${role} (Error: ${error?.message || 'None'})`);
    }
  }
}

testRoles();
