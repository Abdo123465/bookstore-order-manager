# PLAN.md — سعة الموظفين + ترقيم تسلسلي تلقائي (Dashboard/SettingsPanel)

ملاحظة تنفيذ عامة: الترقيم (`sort_order`) بيتخزن كعمود صريح، وبيتقفل الفجوة تلقائيًا بعد أي حذف (إعادة ترقيم من 1 للنهاية). السعة (`employeeCapacity`) بتتخزن جوه `AppSettings` الموجودة أصلاً (JSON) — مفيش عمود DB جديد ليها. الرقم بيظهر في شاشة الإعدادات بس.

---

## 1) types.ts

### BEFORE
```ts
export interface Employee {
  id: string;
  name: string;
}
```
```ts
export interface AppSettings {
  deliveryIntervalDays: number;
  minQuantity: number;
  maxQuantity: number;
  depositPerBook: number;
}
```

### AFTER
```ts
export interface Employee {
  id: string;
  name: string;
  sortOrder: number; // ترتيب الموظف التسلسلي (1..N) — يُحسب ويُدار تلقائيًا
}
```
```ts
export interface AppSettings {
  deliveryIntervalDays: number;
  minQuantity: number;
  maxQuantity: number;
  depositPerBook: number;
  employeeCapacity: number; // السعة القصوى لعدد الموظفين
}
```

---

## 2) main.cjs (SQLite المحلي)

### BEFORE
```js
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
```
```js
  // Migration: Add excess_deposit to orders if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    const hasExcessDeposit = tableInfo.some(col => col.name === 'excess_deposit');
    if (!hasExcessDeposit) {
      db.exec("ALTER TABLE orders ADD COLUMN excess_deposit REAL DEFAULT 0");
    }
  } catch (err) {
    console.error('Migration Error:', err);
  }
```

### AFTER
```js
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER
    );
```
```js
  // Migration: Add excess_deposit to orders if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    const hasExcessDeposit = tableInfo.some(col => col.name === 'excess_deposit');
    if (!hasExcessDeposit) {
      db.exec("ALTER TABLE orders ADD COLUMN excess_deposit REAL DEFAULT 0");
    }
  } catch (err) {
    console.error('Migration Error:', err);
  }

  // Migration: Add sort_order to employees if it doesn't exist, then backfill
  // based on existing insertion order (rowid ascending = original creation order)
  try {
    const empInfo = db.prepare("PRAGMA table_info(employees)").all();
    const hasSortOrder = empInfo.some(col => col.name === 'sort_order');
    if (!hasSortOrder) {
      db.exec("ALTER TABLE employees ADD COLUMN sort_order INTEGER");
      db.exec(`
        UPDATE employees
        SET sort_order = (
          SELECT COUNT(*) FROM employees e2 WHERE e2.rowid <= employees.rowid
        )
      `);
    }
  } catch (err) {
    console.error('Employees sort_order Migration Error:', err);
  }
```

**ملاحظة:** ده migration تلقائي هيتنفذ لوحده أول مرة تفتح فيها البرنامج بعد التحديث (نفس أسلوب `excess_deposit` بالظبط) — مفيش حاجة يدوية مطلوبة منك على الجهاز المحلي.

---

## 3) supabase_schema.sql + تنفيذ يدوي على Supabase الفعلي

⚠️ **مهم:** الملف ده مرجعي بس (بيتقرأ لو حد عمل تنصيب جديد من الصفر) — **مش بينفذ تلقائيًا على قاعدة بياناتك الحالية على Supabase**. علشان الموظفين الموجودين فعلاً يتاخدوا رقمهم، لازم تدخل بنفسك على **Supabase SQL Editor** وتشغل السكريبت الإضافي اللي تحت (خطوة يدوية لمرة واحدة).

### BEFORE (supabase_schema.sql)
```sql
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL
);
```

### AFTER (supabase_schema.sql — للتنصيبات الجديدة فقط)
```sql
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  sort_order INTEGER
);
```

### سكريبت يدوي إضافي (تشغّله إنت مرة واحدة في Supabase SQL Editor على القاعدة الفعلية)
```sql
-- 1. إضافة العمود لو مش موجود
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 2. تعبئة الترقيم حسب ترتيب الإدخال الحالي (باستخدام ctid كترتيب تقريبي للإدخال)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ctid) AS rn
  FROM employees
)
UPDATE employees e
SET sort_order = ordered.rn
FROM ordered
WHERE e.id = ordered.id;
```

---

## 4) services/storage.ts

المسار الفعلي شغال عبر `storage.ts` (الدوال الداخلية `cloud*` بما إن `USE_CLOUD = true`)، فالتعديل الأساسي هنا. هنعدل نفس المنطق في نسخة `local*` كمان للاتساق.

### 4.1 — cloudGetReferenceTable: ترتيب النتيجة حسب sort_order للموظفين

#### BEFORE
```ts
const cloudGetReferenceTable = async <T>(key: string): Promise<T[]> => {
  let tableName = '';
  switch (key) {
    case STORAGE_KEYS.CUSTOMERS: tableName = 'customers'; break;
    case STORAGE_KEYS.ORDERS: tableName = 'orders'; break;
    case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
    case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
    case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
    case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
    case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
    default: return [];
  }
  
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`Cloud fetch error for ${tableName}:`, error);
    return [];
  }
  return data || [];
};
```

#### AFTER
```ts
const cloudGetReferenceTable = async <T>(key: string): Promise<T[]> => {
  let tableName = '';
  switch (key) {
    case STORAGE_KEYS.CUSTOMERS: tableName = 'customers'; break;
    case STORAGE_KEYS.ORDERS: tableName = 'orders'; break;
    case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
    case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
    case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
    case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
    case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
    default: return [];
  }

  let query = supabase.from(tableName).select('*');
  if (key === STORAGE_KEYS.EMPLOYEES) {
    query = query.order('sort_order', { ascending: true });
  }
  const { data, error } = await query;
  if (error) {
    console.error(`Cloud fetch error for ${tableName}:`, error);
    return [];
  }

  if (key === STORAGE_KEYS.EMPLOYEES) {
    return (data || []).map((row: any) => ({ ...row, sortOrder: row.sort_order }));
  }
  return data || [];
};
```

### 4.2 — cloudAddReferenceItem: التحقق من السعة + حساب sort_order التالي

#### BEFORE
```ts
const cloudAddReferenceItem = async (key: string, name: string, extra?: any): Promise<any> => {
    let tableName = '';
    const newData: any = { name };
    
    switch (key) {
        case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
        case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
        case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
        case STORAGE_KEYS.PAYMENT_METHODS: 
            tableName = 'payment_methods'; 
            newData.type = extra?.type || 'cash';
            break;
        case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
        default: throw new Error(`Unknown reference key: ${key}`);
    }

    const { data, error } = await supabase.from(tableName).insert(newData).select().single();
    if (error) throw new Error(error.message);
    return data;
};
```

#### AFTER
```ts
const cloudAddReferenceItem = async (key: string, name: string, extra?: any): Promise<any> => {
    let tableName = '';
    const newData: any = { name };
    
    switch (key) {
        case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
        case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
        case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
        case STORAGE_KEYS.PAYMENT_METHODS: 
            tableName = 'payment_methods'; 
            newData.type = extra?.type || 'cash';
            break;
        case STORAGE_KEYS.EMPLOYEES: {
            tableName = 'employees';

            const { count, error: countError } = await supabase
                .from('employees')
                .select('id', { count: 'exact', head: true });
            if (countError) throw new Error(countError.message);

            const currentCount = count || 0;

            const appSettings = await getAppSettings();
            const capacity = appSettings?.employeeCapacity ?? 10;

            if (currentCount >= capacity) {
                throw new Error(`تم الوصول للحد الأقصى لعدد الموظفين (${capacity}). قم بزيادة السعة من الإعدادات أو احذف موظفًا أولًا.`);
            }

            newData.sort_order = currentCount + 1;
            break;
        }
        default: throw new Error(`Unknown reference key: ${key}`);
    }

    const { data, error } = await supabase.from(tableName).insert(newData).select().single();
    if (error) throw new Error(error.message);

    if (key === STORAGE_KEYS.EMPLOYEES && data) {
        return { ...data, sortOrder: data.sort_order };
    }
    return data;
};
```
**افتراض تنفيذي:** `getAppSettings` بيتنادى هنا من جوه `storage.ts` نفسه (تعريفها في نفس الملف تحت)، فمفيش مشكلة استيراد.

### 4.3 — cloudDeleteReferenceItem: إعادة الترقيم بعد الحذف

#### BEFORE
```ts
const cloudDeleteReferenceItem = async (key: string, id: string): Promise<any> => {
    let tableName = '';
    switch (key) {
        case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
        case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
        case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
        case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
        case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
        default: throw new Error(`Unknown reference key: ${key}`);
    }

    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
};
```

#### AFTER
```ts
const cloudDeleteReferenceItem = async (key: string, id: string): Promise<any> => {
    let tableName = '';
    switch (key) {
        case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
        case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
        case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
        case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
        case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
        default: throw new Error(`Unknown reference key: ${key}`);
    }

    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw new Error(error.message);

    if (key === STORAGE_KEYS.EMPLOYEES) {
        // إعادة ترقيم الموظفين المتبقيين لقفل أي فجوة نتجت عن الحذف
        const { data: remaining, error: fetchErr } = await supabase
            .from('employees')
            .select('id, sort_order')
            .order('sort_order', { ascending: true });

        if (!fetchErr && remaining) {
            for (let i = 0; i < remaining.length; i++) {
                const expected = i + 1;
                if (remaining[i].sort_order !== expected) {
                    await supabase.from('employees').update({ sort_order: expected }).eq('id', remaining[i].id);
                }
            }
        }
    }

    return { success: true };
};
```

### 4.4 — النسخة المحلية (localGetReferenceTable / localAddReferenceItem / localDeleteReferenceItem)
نفس منطق البند 4.1–4.3 بالظبط، لكن باستخدام `window.electron.db.query` / `db.execute` / `db.getOne` بدل `supabase`:

- **localGetReferenceTable**: لو `key === STORAGE_KEYS.EMPLOYEES`، الاستعلام يبقى:
  `SELECT * FROM employees ORDER BY sort_order ASC`
  بدل `SELECT * FROM ${tableName}` العام، ثم map كل صف لإضافة `sortOrder: row.sort_order`.

- **localAddReferenceItem (حالة EMPLOYEES)**: قبل الـ `INSERT`، ينفذ:
  `SELECT COUNT(*) as cnt FROM employees` عبر `db.getOne`، يجيب `employeeCapacity` من `getAppSettings()`، لو `cnt >= capacity` يرفض برسالة خطأ، وإلا الـ SQL يبقى:
  `INSERT INTO employees (id, name, sort_order) VALUES (?, ?, ?)` بقيم `[crypto.randomUUID(), name, cnt + 1]`.

- **localDeleteReferenceItem (حالة EMPLOYEES)**: بعد الـ `DELETE`، ينفذ:
  `SELECT id FROM employees ORDER BY sort_order ASC` عبر `db.query`، ثم loop على النتيجة ويعمل `UPDATE employees SET sort_order = ? WHERE id = ?` لكل صف رقمه الحالي غير متطابق مع رقمه المتوقع (index+1).

---

## 5) components/SettingsPanel.tsx

### 5.1 — القيمة الافتراضية للإعدادات

#### BEFORE
```tsx
  const [settings, setSettings] = useState<AppSettings>({
    deliveryIntervalDays: 7,
    minQuantity: 1,
    maxQuantity: 10,
    depositPerBook: 100
  });
```

#### AFTER
```tsx
  const [settings, setSettings] = useState<AppSettings>({
    deliveryIntervalDays: 7,
    minQuantity: 1,
    maxQuantity: 10,
    depositPerBook: 100,
    employeeCapacity: 10
  });
```

### 5.2 — إضافة موظف: عرض رسالة الخطأ الفعلية للمستخدم بدل الاكتفاء بـ console.error

#### BEFORE
```tsx
  const handleAddEmployee = async () => {
    if (!newEmployee.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.EMPLOYEES, newEmployee);
      const updated = await getReferenceTable<Employee>(STORAGE_KEYS.EMPLOYEES);
      setEmployees(updated);
      setNewEmployee('');
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };
```

#### AFTER
```tsx
  const handleAddEmployee = async () => {
    if (!newEmployee.trim()) return;
    try {
      await addReferenceItem(STORAGE_KEYS.EMPLOYEES, newEmployee);
      const updated = await getReferenceTable<Employee>(STORAGE_KEYS.EMPLOYEES);
      setEmployees(updated);
      setNewEmployee('');
      if (onRefreshData) onRefreshData();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      alert(error?.message || 'حدث خطأ أثناء إضافة الموظف');
    }
  };
```

### 5.3 — حفظ الإعدادات: منع تقليل السعة تحت العدد الحالي

#### BEFORE
```tsx
  const handleSaveSettings = async () => {
    try {
      await saveAppSettings(settings);
      alert('تم حفظ الإعدادات بنجاح');
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    }
  };
```

#### AFTER
```tsx
  const handleSaveSettings = async () => {
    if (settings.employeeCapacity < employees.length) {
      alert(`لا يمكن تقليل سعة الموظفين إلى ${settings.employeeCapacity} وعدد الموظفين الحالي ${employees.length}. احذف موظفين أولًا.`);
      return;
    }
    try {
      await saveAppSettings(settings);
      alert('تم حفظ الإعدادات بنجاح');
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    }
  };
```

### 5.4 — إضافة حقل "سعة الموظفين" في قسم الإعدادات العامة

#### BEFORE
```tsx
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للكمية</label>
              <input
                type="number"
                value={settings.minQuantity}
                onChange={(e) => setSettings({ ...settings, minQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للكمية</label>
              <input
                type="number"
                value={settings.maxQuantity}
                onChange={(e) => setSettings({ ...settings, maxQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
```

#### AFTER
```tsx
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للكمية</label>
              <input
                type="number"
                value={settings.minQuantity}
                onChange={(e) => setSettings({ ...settings, minQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للكمية</label>
              <input
                type="number"
                value={settings.maxQuantity}
                onChange={(e) => setSettings({ ...settings, maxQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              سعة الموظفين (العدد الأقصى المسموح به) — الحالي: {employees.length}
            </label>
            <input
              type="number"
              min={employees.length}
              value={settings.employeeCapacity}
              onChange={(e) => setSettings({ ...settings, employeeCapacity: parseInt(e.target.value) || employees.length })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <button
            onClick={handleSaveSettings}
```

### 5.5 — عرض رقم الموظف في قسم "الموظفون"

#### BEFORE
```tsx
                <>
                  <span className="text-sm">{e.name}</span>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(e.id, e.name)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveEmployee(e.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
```

#### AFTER
```tsx
                <>
                  <span className="text-sm">
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full w-5 h-5 text-center leading-5 ml-2">
                      {e.sortOrder}
                    </span>
                    {e.name}
                  </span>
                  <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditing(e.id, e.name)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveEmployee(e.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
```

---

## ملفات ملهاش تعديل (بالقرار)
- `components/UnifiedOrderForm.tsx`, `components/EditOrderModal.tsx`: بيستخدموا `employees` بس لعرض الاسم في dropdown — مفيش داعي لعرض الرقم فيهم (اتفقنا الرقم في شاشة الإعدادات بس).
- `services/storage.cloud.ts`, `services/customer.service.cloud.ts`, `services/order.service.cloud.ts`: مش متصلين بالتطبيق فعليًا، مفيش داعي نلمسهم دلوقتي.

## خطوات التنفيذ بالترتيب
1. `types.ts`
2. `main.cjs` (الـ migration هيشتغل تلقائي أول تشغيل بعد التحديث)
3. `supabase_schema.sql` + تشغيل السكريبت اليدوي على Supabase SQL Editor (خطوة يدوية منك، مرة واحدة)
4. `services/storage.ts` (cloud + local، حسب البند 4)
5. `components/SettingsPanel.tsx` (حسب البند 5)
