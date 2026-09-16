/**
 * ================================================================
 * SQLite to Supabase Data Migration Script
 * ================================================================
 * 
 * هذا السكربت يقوم بنقل جميع البيانات من قاعدة بيانات SQLite المحلية
 * إلى Supabase السحابية.
 * 
 * كيفية التشغيل:
 * 1. تأكد من أن البرنامج مقفول
 * 2. شغل: npm run migrate-data
 * ================================================================
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Supabase Configuration
const SUPABASE_URL = 'https://hecrrzepeqxduwfsenqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3JyemVwZXF4ZHV3ZnNlbnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDEwOTksImV4cCI6MjA4NTk3NzA5OX0.VHJl0jvFv4cL8ZOB0WM9DVObR9tRBy4acZUTp44Z8hM';

// Find the local database path
function findDatabasePath() {
  const possiblePaths = [
    // MAIN PATH - Correct database on other machine
    'D:\\abdo\\حجز كتب\\database\\library.db',
    // Previous path (wrong one)
    'C:\\Users\\Tafaneen 3\\AppData\\Roaming\\bookstore-order-manager\\library.db',
    // Production portable path
    path.join(path.dirname(process.execPath), 'database', 'library.db'),
    // Development path (userData)
    path.join(process.env.APPDATA || '', 'bookstore-order-manager', 'library.db'),
    // Alternative development path
    path.join(process.env.LOCALAPPDATA || '', 'bookstore-order-manager', 'library.db'),
  ];

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      console.log(`✅ Found database at: ${dbPath}`);
      return dbPath;
    }
  }

  // Ask user for path
  console.error('❌ Could not find database automatically.');
  console.log('Please check these paths:');
  possiblePaths.forEach(p => console.log(`  - ${p}`));
  return null;
}

// Fetch helper for Supabase REST API
async function supabaseRequest(table, method, data = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }

  return response;
}

// Delete all existing data from Supabase tables
async function clearSupabaseTables() {
  console.log('\n🗑️  Clearing existing Supabase data...');
  
  // Order matters - delete dependent tables first
  const tables = ['orders', 'customers', 'settings', 'employees', 'payment_methods', 'subjects', 'academic_years', 'publishers'];
  
  for (const table of tables) {
    try {
      // Use a query parameter that matches all records
      const url = `${SUPABASE_URL}/rest/v1/${table}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      
      if (response.ok || response.status === 406) {
        console.log(`  ✅ Cleared ${table}`);
      } else {
        const error = await response.text();
        console.log(`  ⚠️  Could not clear ${table}: ${response.status} - ${error}`);
      }
    } catch (err) {
      console.log(`  ⚠️  Could not clear ${table}: ${err.message}`);
    }
  }
}

// Migrate a single table
async function migrateTable(db, tableName, columnMap, transform = null) {
  console.log(`\n📥 Migrating ${tableName}...`);
  
  try {
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    console.log(`   Found ${rows.length} records`);
    
    if (rows.length === 0) {
      console.log('   Skipping (no data)');
      return 0;
    }

    // Transform data if needed
    const transformedRows = transform 
      ? rows.map(transform) 
      : rows.map(row => {
          const newRow = {};
          for (const [sqliteCol, supabaseCol] of Object.entries(columnMap)) {
            if (row[sqliteCol] !== undefined) {
              newRow[supabaseCol] = row[sqliteCol];
            }
          }
          return newRow;
        });

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < transformedRows.length; i += batchSize) {
      const batch = transformedRows.slice(i, i + batchSize);
      await supabaseRequest(tableName, 'POST', batch);
      console.log(`   Uploaded ${Math.min(i + batchSize, transformedRows.length)}/${transformedRows.length}`);
    }

    return rows.length;
  } catch (err) {
    console.error(`   ❌ Error migrating ${tableName}: ${err.message}`);
    return 0;
  }
}

// Main migration function
async function migrate() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     SQLite to Supabase Data Migration                  ║');
  console.log('║     نقل البيانات من SQLite إلى Supabase               ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Find database
  const dbPath = findDatabasePath();
  if (!dbPath) {
    console.log('\n❌ Migration aborted: Database not found');
    console.log('\nPlease provide the database path manually by editing this script.');
    process.exit(1);
  }

  // Connect to SQLite
  console.log('\n📂 Connecting to SQLite database...');
  const db = new Database(dbPath, { readonly: true });

  try {
    // Clear Supabase first
    await clearSupabaseTables();

    let totalMigrated = 0;

    // Migrate Customers
    totalMigrated += await migrateTable(db, 'customers', {
      id: 'id',
      name: 'name',
      phone: 'phone'
    });

    // Migrate Publishers
    totalMigrated += await migrateTable(db, 'publishers', {
      id: 'id',
      name: 'name'
    });

    // Migrate Academic Years
    totalMigrated += await migrateTable(db, 'academic_years', {
      id: 'id',
      name: 'name'
    });

    // Migrate Subjects
    totalMigrated += await migrateTable(db, 'subjects', {
      id: 'id',
      name: 'name'
    });

    // Migrate Payment Methods
    totalMigrated += await migrateTable(db, 'payment_methods', {
      id: 'id',
      name: 'name',
      type: 'type'
    });

    // Migrate Employees
    totalMigrated += await migrateTable(db, 'employees', {
      id: 'id',
      name: 'name'
    });

    // Migrate Settings
    totalMigrated += await migrateTable(db, 'settings', {
      key: 'key',
      value: 'value'
    });

    // Migrate Orders (with transformation)
    totalMigrated += await migrateTable(db, 'orders', {}, (row) => ({
      id: row.id,
      customer_id: row.customer_id,
      publisher_id: row.publisher_id,
      year_id: row.year_id,
      subject: row.subject,
      quantity: row.quantity,
      deposit: row.deposit,
      payment_method_id: row.payment_method_id,
      status: row.status,
      received_date: row.received_date,
      expected_delivery_date: row.expected_delivery_date,
      created_at: row.created_at,
      employee_name: row.employee_name,
      book_type: row.book_type,
      notes: row.notes,
      items: row.items ? JSON.parse(row.items) : [],
      excess_deposit: row.excess_deposit || 0
    }));

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log(`║  ✅ Migration Complete! Total records: ${totalMigrated}`.padEnd(59) + '║');
    console.log('╚════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
migrate().catch(console.error);
