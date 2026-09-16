const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://hecrrzepeqxduwfsenqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3JyemVwZXF4ZHV3ZnNlbnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDEwOTksImV4cCI6MjA4NTk3NzA5OX0.VHJl0jvFv4cL8ZOB0WM9DVObR9tRBy4acZUTp44Z8hM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixSequences() {
  console.log('🔧 Starting STRICT Sequence Fixer via REST API...');

  await fixTableSequence('customers', () => ({
    name: 'SequenceFixer',
    phone: `000000_${Math.floor(Math.random() * 10000000)}`
  }));

  // Need a valid customer ID for order
  const { data: customer } = await supabase.from('customers').select('id').limit(1).single();
  const customerId = customer?.id || 1;

  await fixTableSequence('orders', () => ({
    customer_id: customerId,
    subject: 'SequenceFixer',
    quantity: 1,
    deposit: 0,
    status: 'Cancelled'
  }));

  console.log('🎉 All sequences synchronized correctly!');
}

async function fixTableSequence(table, dummyDataFn) {
  console.log(`\n👉 Fixing sequence for table: ${table}`);
  
  // 1. Get Real MAX ID
  const { data: maxResult } = await supabase
    .from(table)
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();
    
  const maxId = maxResult ? maxResult.id : 0;
  console.log(`   Current Max ID: ${maxId}`);

  let attempts = 0;
  const MAX_ATTEMPTS = 2000;
  
  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    const dummyData = dummyDataFn();
    
    // Insert
    const { data, error } = await supabase
      .from(table)
      .insert(dummyData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505' && error.message.includes('pkey')) {
         process.stdout.write('x'); // Collision
         continue;
      } else {
        console.error(`\n❌ Unexpected error on ${table} (attempt ${attempts}):`, error.message);
        if (error.code === '23505') { 
            continue; // Retry for other unique constraints
        }
        break;
      }
    }

    if (data) {
      // SUCCESS!
      const currentId = data.id;
      
      // Delete the dummy record immediately
      await supabase.from(table).delete().eq('id', currentId);
      
      if (currentId > maxId) {
          console.log(`\n✅ Generated ID ${currentId} is > Max ID ${maxId}. Sequence is FIXED.`);
          return;
      } else {
          process.stdout.write('.'); // Filling gap
          // Loop continues to consume sequence
      }
    }
  }

  if (attempts >= MAX_ATTEMPTS) {
    console.error(`\n⚠️ Failed to fix sequence for ${table} after ${MAX_ATTEMPTS} attempts.`);
  }
}

fixSequences();
