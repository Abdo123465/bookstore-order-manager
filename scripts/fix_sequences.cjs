const { Client } = require('pg');

const DB_PASSWORD = 'KDqcUW512jneOg6r';
const DB_HOST = 'db.hecrrzepeqxduwfsenqt.supabase.co';
const DB_USER = 'postgres';
const DB_NAME = 'postgres';
const PORT = 5432;

const client = new Client({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: PORT,
  ssl: { rejectUnauthorized: false }
});

async function fixSequences() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected.');

    // Function to fix sequence for a table
    const fixTable = async (table, seqParams) => {
      console.log(`🔧 Fixing sequence for ${table}...`);
      
      // Get Max ID
      const res = await client.query(`SELECT MAX(id) as max_id FROM ${table}`);
      const maxId = res.rows[0].max_id || 0;
      console.log(`   Current MAX(id) for ${table}: ${maxId}`);

      // Set Sequence
      // Note: Assuming standard naming convention for Supabase Identity columns
      // If it uses SERIAL it might be table_id_seq, if IDENTITY it might be different.
      // We will try both common names or query the sequence name.
      
      // Query to find sequence name
      const seqQuery = `
        SELECT pg_get_serial_sequence('${table}', 'id') as seq_name;
      `;
      const seqRes = await client.query(seqQuery);
      let seqName = seqRes.rows[0].seq_name;
      
      if (!seqName) {
        // Fallback guess
        seqName = `${table}_id_seq`;
        console.log(`   ⚠️ Could not determine sequence name automatically. Trying fallback: ${seqName}`);
      } else {
        console.log(`   Found sequence: ${seqName}`);
      }
      
      // Reset Sequence
      const resetQuery = `SELECT setval('${seqName}', ${maxId + 1}, false)`;
      await client.query(resetQuery);
      console.log(`   ✅ Sequence confirmed set to ${maxId + 1}`);
    };

    await fixTable('customers');
    await fixTable('orders');

    console.log('🎉 All sequences fixed!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

fixSequences();
