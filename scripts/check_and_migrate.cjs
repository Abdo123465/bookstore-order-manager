/**
 * ================================================================
 * سكريبت: فحص الجداول + نقل البيانات من library.db (SQLite) لمشروع Supabase الجديد
 * ================================================================
 *
 * ملاحظة أمان: بيستخدم service_role key (صلاحيات كاملة) — استخدمه من جهازك
 * الشخصي بس، ومتحطش المفتاح ده أبدًا جوه كود التطبيق (services/supabase.config.ts).
 *
 * طريقة الاستخدام:
 *   node scripts/check_and_migrate.cjs "<SUPABASE_URL>" "<SERVICE_ROLE_KEY>" "<PATH_TO_library.db>"
 *
 * مثال:
 *   node scripts/check_and_migrate.cjs "https://mtqfkhrvmitdhtvxywqm.supabase.co" "eyJ..." "D:\abdo\حجز كتب\database\library.db"
 *
 * السكريبت أولًا بيتأكد إن الجداول موجودة على المشروع الجديد.
 * لو مش موجودة، هيوقف ويقولك تشغل supabase_schema.sql الأول من SQL Editor.
 * لو موجودة، هينقل كل البيانات من library.db بالترتيب الصحيح (عشان الـforeign keys).
 */

const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');
const fs = require('fs');

const SUPABASE_URL = process.argv[2];
const SERVICE_ROLE_KEY = process.argv[3];
const DB_PATH = process.argv[4];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DB_PATH) {
  console.error('❌ استخدام خاطئ. المطلوب: node check_and_migrate.cjs <URL> <SERVICE_ROLE_KEY> <PATH_TO_library.db>');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ ملف قاعدة البيانات مش موجود في المسار: ${DB_PATH}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const db = new Database(DB_PATH, { readonly: true });

const REQUIRED_TABLES = [
  'customers', 'orders', 'publishers', 'academic_years',
  'subjects', 'payment_methods', 'employees', 'settings', 'logs'
];

async function checkTablesExist() {
  console.log('🔍 فحص وجود الجداول على المشروع الجديد...\n');
  const missing = [];
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${table}: غير موجود أو فيه مشكلة (${error.message})`);
      missing.push(table);
    } else {
      console.log(`✅ ${table}: موجود`);
    }
  }
  return missing;
}

async function migrateTable(tableName, rows, mapFn) {
  if (rows.length === 0) {
    console.log(`⏭️  ${tableName}: مفيش صفوف للنقل`);
    return;
  }
  const mapped = rows.map(mapFn);
  const { error } = await supabase.from(tableName).insert(mapped);
  if (error) {
    console.error(`❌ خطأ أثناء نقل ${tableName}:`, error.message);
  } else {
    console.log(`✅ ${tableName}: تم نقل ${mapped.length} صف`);
  }
}

async function run() {
  const missing = await checkTablesExist();

  if (missing.length > 0) {
    console.log('\n⚠️  الجداول التالية مش موجودة على المشروع الجديد:');
    missing.forEach(t => console.log(`   - ${t}`));
    console.log('\n👉 لازم تشغل ملف supabase_schema.sql الأول من Supabase SQL Editor بتاع المشروع الجديد، وبعدين تعيد تشغيل السكريبت ده.');
    db.close();
    process.exit(1);
  }

  console.log('\n✅ كل الجداول موجودة. جاري بدء نقل البيانات...\n');

  // الترتيب مهم بسبب الـ foreign keys: customers/publishers/... قبل orders

  const customers = db.prepare('SELECT * FROM customers').all();
  await migrateTable('customers', customers, (c) => ({
    id: c.id, name: c.name, phone: c.phone
  }));

  const publishers = db.prepare('SELECT * FROM publishers').all();
  await migrateTable('publishers', publishers, (p) => ({ id: p.id, name: p.name }));

  const years = db.prepare('SELECT * FROM academic_years').all();
  await migrateTable('academic_years', years, (y) => ({ id: y.id, name: y.name }));

  const subjects = db.prepare('SELECT * FROM subjects').all();
  await migrateTable('subjects', subjects, (s) => ({ id: s.id, name: s.name }));

  const paymentMethods = db.prepare('SELECT * FROM payment_methods').all();
  await migrateTable('payment_methods', paymentMethods, (p) => ({ id: p.id, name: p.name, type: p.type }));

  const employees = db.prepare('SELECT * FROM employees').all();
  await migrateTable('employees', employees, (e) => ({
    id: e.id, name: e.name, sort_order: e.sort_order ?? null
  }));

  const orders = db.prepare('SELECT * FROM orders').all();
  await migrateTable('orders', orders, (o) => ({
    id: o.id,
    customer_id: o.customer_id,
    publisher_id: o.publisher_id,
    year_id: o.year_id,
    subject: o.subject,
    quantity: o.quantity,
    deposit: o.deposit,
    payment_method_id: o.payment_method_id,
    status: o.status,
    received_date: o.received_date,
    expected_delivery_date: o.expected_delivery_date,
    created_at: o.created_at,
    employee_name: o.employee_name,
    book_type: o.book_type,
    notes: o.notes,
    items: o.items,
    excess_deposit: o.excess_deposit ?? 0
  }));

  const settings = db.prepare('SELECT * FROM settings').all();
  await migrateTable('settings', settings, (s) => ({ key: s.key, value: s.value }));

  console.log('\n🎉 انتهى النقل. راجع الأرقام فوق للتأكد إن كل جدول اتنقل صح.');
  console.log('💡 ملاحظة: جدول logs متعمدين نتجاهله (سجل تشخيصي داخلي، مش بيانات عمل حقيقية).');

  db.close();
}

run();
