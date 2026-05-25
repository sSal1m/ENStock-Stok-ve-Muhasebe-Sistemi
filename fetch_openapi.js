const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) env[key.trim()] = values.join('=').trim();
});

async function fetchOpenApi() {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${env.SUPABASE_SERVICE_ROLE_KEY}`);
  const json = await res.json();
  const profilesComp = json.definitions?.profiles?.properties?.role;
  console.log("Profiles Role Schema:", JSON.stringify(profilesComp, null, 2));
}

fetchOpenApi();
