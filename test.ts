import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const res = await supabase.from('role_permissions').upsert([
    { role: 'test-uuid-999', module: 'invoices', can_view: true, can_create: true, can_edit: true, can_delete: true }
  ], { onConflict: 'role,module' });
  console.log(res);
}
check();
