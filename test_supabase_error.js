require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('invoices').insert([
    {
      user_id: 'cc889df6-57f6-47bf-a636-8a9443c404c7', // Using ID from previous logs
      created_by: 'cc889df6-57f6-47bf-a636-8a9443c404c7',
      contact_id: '59752b11-3709-49f7-aa25-980a91a18255',
      type: 'sale',
      invoice_number: 'TEST-1234',
      issue_date: '2026-04-23',
      subtotal: 100,
      tax_total: 20,
      total_amount: 120,
      status: 'draft',
      currency: 'TRY',
      exchange_rate: 1
    }
  ]);
  
  if (error) {
    console.error('INSERT ERROR:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
  }
}

testInsert();
