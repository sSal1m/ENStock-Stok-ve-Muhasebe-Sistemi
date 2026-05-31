import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
});

// Create client using ANON KEY (client side)!
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  // We need to login as Seha Salim
  // Wait, I don't know Seha Salim's password.
  // Can I check the policies directly using service role?
  const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: policies } = await adminClient.rpc('get_policies');
  if (!policies) {
    // try to query pg_policies
    const { data } = await adminClient.from('role_permissions').select('*').limit(1);
    console.log("Just checking if the table exists and data:", data);
  }
}
check();
