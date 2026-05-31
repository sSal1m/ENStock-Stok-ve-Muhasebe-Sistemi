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
  console.log("--- QUERYING TRIGGER FUNCTION handle_new_user ---");
  try {
    const { data: procData, error: procError } = await supabase
      .from('pg_proc')
      .select('proname, prosrc')
      .ilike('proname', '%handle_new_user%');
      
    if (procError) {
      console.error("Error querying pg_proc:", procError);
    } else {
      console.log("Procedure data:", procData);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

check();
