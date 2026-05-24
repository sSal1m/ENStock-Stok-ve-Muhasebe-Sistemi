const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Environment variables are missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  try {
    console.log("🔍 Checking cari_hareketler table structure...\n");

    // Get table structure
    const { data: tables, error: tablesError } = await supabase.rpc("query_info_schema", {
      table_name: "cari_hareketler",
    }).catch(() => null);

    // Alternative: Direct query
    const { data: schema, error: schemaError } = await supabase
      .from("information_schema.tables")
      .select("*")
      .eq("table_name", "cari_hareketler")
      .catch(() => ({ data: null, error: "Method not available" }));

    console.log("Attempting to check table existence via SELECT...");
    const { data: sample, error: sampleError } = await supabase
      .from("cari_hareketler")
      .select("*")
      .limit(1);

    if (sampleError) {
      console.log("❌ cari_hareketler table error:", sampleError.message);
    } else {
      console.log("✅ cari_hareketler table exists");
      console.log("Sample row:", sample);
    }

    // Check for triggers
    console.log("\n🔍 Checking for triggers...\n");
    const { data: triggers, error: triggersError } = await supabase.rpc("query_triggers", {}).catch(() => null);

    if (triggersError) {
      console.log("⚠️  Could not query triggers directly. Checking table structure instead.");
    }

    // Check contacts table
    console.log("\n🔍 Checking contacts table...\n");
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("*")
      .limit(1);

    if (contactsError) {
      console.log("❌ contacts table error:", contactsError.message);
    } else {
      console.log("✅ contacts table exists");
      console.log("Sample row:", contacts);
    }

    // Check for any contact-related tables
    console.log("\n🔍 Searching for contact-related tables...\n");
    const { data: allTables, error: allTablesError } = await supabase
      .rpc("query_tables")
      .catch(async () => {
        // Fallback: try to list tables by attempting to query common names
        const tableNames = ["contact_logs", "cari_hareketler", "cari_movements", "contact_movements"];
        const results = {};
        for (const name of tableNames) {
          const { error } = await supabase.from(name).select("*").limit(1);
          results[name] = !error;
        }
        return { data: results };
      });

    console.log("Available contact-related tables:", allTables);

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
