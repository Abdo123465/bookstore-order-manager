/**
 * ================================================================
 * سكريبت تشخيصي فقط — لا يعدل أي بيانات
 * الهدف: التأكد من محتوى مشروع Supabase (أي مشروع تحدده) قبل اتخاذ
 * أي قرار بخصوص الترحيل أو حذف أي مشروع قديم.
 * ================================================================
 *
 * طريقة الاستخدام:
 *   node scripts/diagnose_supabase.cjs "<SUPABASE_URL>" "<ANON_KEY>"
 *
 * مثال:
 *   node scripts/diagnose_supabase.cjs "https://xxxxx.supabase.co" "eyJhbGciOi..."
 *
 * شغّله مرتين: مرة بمعلومات المشروع اللي فيه hecrrzepeqxduwfsenqt،
 * ومرة بمعلومات المشروع الجديد اللي عملته، وقارن النتائج.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.argv[2];
const SUPABASE_ANON_KEY = process.argv[3];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ استخدام خاطئ. المطلوب: node diagnose_supabase.cjs <URL> <ANON_KEY>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES = [
  'customers',
  'orders',
  'employees',
  'publishers',
  'academic_years',
  'subjects',
  'payment_methods',
  'settings',
  'logs'
];

async function diagnose() {
  console.log('================================================');
  console.log(`🔍 فحص المشروع: ${SUPABASE_URL}`);
  console.log('================================================\n');

  for (const table of TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: خطأ — ${error.message}`);
        continue;
      }
      console.log(`📊 ${table}: ${count ?? 0} صف`);
    } catch (err) {
      console.log(`❌ ${table}: خطأ غير متوقع — ${err.message}`);
    }
  }

  console.log('\n--- عينة من أهم الجداول (لمعاينة هل البيانات حقيقية) ---\n');

  try {
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .limit(3);
    console.log('👤 عينة عملاء:', JSON.stringify(customers, null, 2));
  } catch (err) {
    console.log('❌ تعذر جلب عينة عملاء:', err.message);
  }

  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    console.log('\n📦 آخر 3 طلبات:', JSON.stringify(orders, null, 2));
  } catch (err) {
    console.log('❌ تعذر جلب عينة طلبات:', err.message);
  }

  try {
    const { data: employees } = await supabase
      .from('employees')
      .select('*');
    console.log('\n👥 الموظفون:', JSON.stringify(employees, null, 2));
  } catch (err) {
    console.log('❌ تعذر جلب الموظفين:', err.message);
  }

  console.log('\n================================================');
  console.log('✅ انتهى الفحص.');
  console.log('================================================');
}

diagnose();
