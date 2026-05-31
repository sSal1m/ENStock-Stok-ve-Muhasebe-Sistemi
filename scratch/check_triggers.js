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
  console.log("--- TRIGGERS ON PROFILES OR AUTH ---");
  const { data: triggers, error: tError } = await supabase.rpc('get_triggers_info');
  if (tError) {
    // If RPC doesn't exist, we can run raw SQL via a query if we have a way,
    // but in Supabase we can use pg_catalog queries if we fetch them via rpc or if we check migrations.
    // Let's try to query triggers using a general query or check function definitions.
    console.error("RPC get_triggers_info not found, trying raw SQL query via public tables if possible.");
    
    // Let's write a query using a basic select on pg_trigger if RLS allows or via RPC.
    // Wait, Supabase client doesn't allow raw SQL queries directly unless we use an RPC.
    // Is there any RPC defined? Let's check what RPCs are available, or let's inspect the migrations.
  }
  
  // Let's check if there's any file in the migrations or if we can run a query to get trigger definitions.
  // Wait, does the project have a custom RPC?
  // Let's run a query to list all functions or triggers in the system using a postgres query if we can.
  // Wait, let's look at the migration files in the repo to see if they define any triggers.
  // We listed migrations/ before:
  // - add_activity_logs.sql
  // - add_default_currency.sql
  // - add_invoice_try_amounts.sql
  // - add_quote_currency.sql
  // None of these define the profiles trigger. It must have been created directly in Supabase or in an older migration.
}

check();
