const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInvitations() {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error querying invitations table:", error.message);
    if (error.code === 'PGRST116') {
        console.log("Table might be empty, but it exists.");
    }
  } else if (data && data.length > 0) {
    console.log("Found record in 'invitations' table:");
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log("'invitations' table is empty or could not be found.");
  }
}

checkInvitations();
