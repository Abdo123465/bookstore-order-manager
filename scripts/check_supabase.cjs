const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hecrrzepeqxduwfsenqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3JyemVwZXF4ZHV3ZnNlbnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDEwOTksImV4cCI6MjA4NTk3NzA5OX0.VHJl0jvFv4cL8ZOB0WM9DVObR9tRBy4acZUTp44Z8hM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  console.log('🔍 Checking Supabase Data...');
  
  const tables = ['orders', 'customers', 'publishers'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Error checking ${table}:`, error.message);
    } else {
      console.log(`✅ ${table}: ${count} records`);
    }
  }

  // Fetch one order to see structure
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);
    
  if (orders && orders.length > 0) {
    console.log('📝 Sample Order:', JSON.stringify(orders[0], null, 2));
  }
}

checkData();
