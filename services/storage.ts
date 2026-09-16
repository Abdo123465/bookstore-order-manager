import { USE_CLOUD } from './config';
import { supabase } from './supabase.service';
import { AppSettings } from '../types';
import { captureError, captureWarning } from './error-handler';
import { triggerInvalidate } from './cache-invalidation';

// Base Storage Service (SQLite via Electron IPC)

declare global {
  interface Window {
    electron: {
      db: {
        query: (sql: string, params?: any[]) => Promise<any[]>;
        execute: (sql: string, params?: any[]) => Promise<{ lastInsertRowid: number; changes: number }>;
        getOne: (sql: string, params?: any[]) => Promise<any>;
      }
    }
  }
}

export const STORAGE_KEYS = {
  CUSTOMERS: 'bookstore_customers',
  ORDERS: 'bookstore_orders',
  LOGS: 'bookstore_sql_logs',
  PUBLISHERS: 'bookstore_publishers',
  ACADEMIC_YEARS: 'bookstore_years',
  SUBJECTS: 'bookstore_subjects',
  PAYMENT_METHODS: 'bookstore_payment_methods',
  BOOK_TYPES: 'bookstore_book_types',
  EMPLOYEES: 'bookstore_employees',
  SETTINGS: 'bookstore_settings',
  MIGRATION_DONE: 'bookstore_sqlite_migration_done'
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  deliveryIntervalDays: 7,
  minQuantity: 1,
  maxQuantity: 10,
  depositPerBook: 100,
  employeeCapacity: 10
};

const normalizeAppSettings = (settings?: Partial<AppSettings> | null): AppSettings => {
  const employeeCapacity = Number(settings?.employeeCapacity);

  return {
    ...DEFAULT_APP_SETTINGS,
    ...(settings || {}),
    employeeCapacity: Number.isFinite(employeeCapacity)
      ? employeeCapacity
      : DEFAULT_APP_SETTINGS.employeeCapacity
  };
};

const mapEmployeeRecord = (row: any, fallbackOrder?: number) => ({
  ...(row || {}),
  sortOrder: row?.sort_order ?? row?.sortOrder ?? fallbackOrder ?? 0
});

const getEmployeeCount = async (): Promise<number> => {
  if (USE_CLOUD) {
    const { count, error } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  }

  const row = await window.electron.db.getOne('SELECT COUNT(*) as count FROM employees');
  return row?.count || 0;
};

// Helper to log "SQL" for the UI to display
export const logSQL = async (query: string) => {
  try {
    const id = crypto.randomUUID();
    const timestamp = new Date().toLocaleTimeString();
    // Only log to local DB if available
    if (window.electron && window.electron.db) {
        await window.electron.db.execute(
        'INSERT INTO logs (id, timestamp, query) VALUES (?, ?, ?)',
        [id, timestamp, query]
        );
    }
    window.dispatchEvent(new Event('sql-log-updated'));
  } catch (err) {
    captureWarning('Failed to log SQL', { source: 'storage', action: 'logSQL', metadata: { error: String(err) } });
  }
};

// ============================================
// CLOUD IMPLEMENTATIONS
// ============================================

const cloudGetReferenceTable = async <T>(key: string): Promise<T[]> => {
  let tableName = '';
  switch (key) {
    case STORAGE_KEYS.CUSTOMERS: tableName = 'customers'; break;
    case STORAGE_KEYS.ORDERS: tableName = 'orders'; break;
    case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
    case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
    case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
    case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
    case STORAGE_KEYS.BOOK_TYPES: tableName = 'book_types'; break;
    case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
    default:
      captureWarning('Unknown reference key', { source: 'storage', action: 'cloudGetReferenceTable', metadata: { key } });
      return [];
  }

  let query = supabase.from(tableName).select('*');
  if (key === STORAGE_KEYS.EMPLOYEES) {
    query = query.order('sort_order', { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    captureWarning('Cloud fetch error for reference table', { source: 'storage', action: 'cloudGetReferenceTable', metadata: { tableName, error: error.message } });
    return [];
  }

  if (key === STORAGE_KEYS.EMPLOYEES) {
    return (data || []).map((row, index) => mapEmployeeRecord(row, index)) as T[];
  }

  return data || [];
};

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
        case STORAGE_KEYS.BOOK_TYPES:
            tableName = 'book_types';
            break;
        case STORAGE_KEYS.EMPLOYEES: {
            tableName = 'employees';

            const capacitySettings = normalizeAppSettings(await getAppSettings());
            const { count, error: countError } = await supabase
              .from('employees')
              .select('id', { count: 'exact', head: true });

            if (countError) throw new Error(countError.message);

            if ((count || 0) >= capacitySettings.employeeCapacity) {
              throw new Error(
                `لا يمكن إضافة موظف جديد لأن السعة القصوى للموظفين وصلت إلى ${capacitySettings.employeeCapacity}.`
              );
            }

            const { data: maxRows, error: maxError } = await supabase
              .from('employees')
              .select('sort_order')
              .order('sort_order', { ascending: false })
              .limit(1);

            if (maxError) throw new Error(maxError.message);

            newData.sort_order = (maxRows?.[0]?.sort_order || 0) + 1;
            break;
        }
        default: throw new Error(`Unknown reference key: ${key}`);
    }

    const { data, error } = await supabase.from(tableName).insert(newData).select().single();
    if (error) throw new Error(error.message);

    if (key === STORAGE_KEYS.EMPLOYEES && data) {
      triggerInvalidate();
      return mapEmployeeRecord(data);
    }

    triggerInvalidate();
    return data;
};

const cloudUpdateReferenceItem = async (key: string, id: string, name: string, extra?: any): Promise<any> => {
    let tableName = '';
    const updates: any = { name };

    switch (key) {
        case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
        case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
        case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
        case STORAGE_KEYS.PAYMENT_METHODS:
            tableName = 'payment_methods';
            if (extra?.type) updates.type = extra.type;
            break;
        case STORAGE_KEYS.BOOK_TYPES: tableName = 'book_types'; break;
        case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
        default: throw new Error(`Unknown reference key: ${key}`);
    }

    const { data, error } = await supabase.from(tableName).update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);

    if (key === STORAGE_KEYS.EMPLOYEES && data) {
      triggerInvalidate();
      return mapEmployeeRecord(data);
    }

    triggerInvalidate();
    return data;
};

const cloudDeleteReferenceItem = async (key: string, id: string): Promise<any> => {
    let tableName = '';
    switch (key) {
        case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
        case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
        case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
        case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
        case STORAGE_KEYS.BOOK_TYPES: tableName = 'book_types'; break;
        case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
        default: throw new Error(`Unknown reference key: ${key}`);
    }

    if (key === STORAGE_KEYS.BOOK_TYPES) {
      let typeName = '';
      if (USE_CLOUD) {
        const { data: bt, error: btError } = await supabase.from('book_types').select('name').eq('id', id).single();
        if (btError) throw new Error(btError.message);
        typeName = bt?.name || '';
        const { count, error: checkError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('book_type', typeName);
        if (checkError) throw new Error(checkError.message);
        if (count && count > 0) {
          throw new Error(`لا يمكن حذف نوع الكتاب "${typeName}" لأنه مستخدم في ${count} طلب/طلبات.`);
        }
      } else {
        const bt = await window.electron.db.getOne('SELECT name FROM book_types WHERE id = ?', [id]);
        typeName = bt?.name || '';
        const row = await window.electron.db.getOne(
          'SELECT COUNT(*) as count FROM orders WHERE book_type = ?', [typeName]
        );
        if (row?.count > 0) {
          throw new Error(`لا يمكن حذف نوع الكتاب "${typeName}" لأنه مستخدم في ${row.count} طلب/طلبات.`);
        }
      }
    }

    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw new Error(error.message);

    if (key === STORAGE_KEYS.EMPLOYEES) {
      const { data: remaining, error: fetchError } = await supabase
        .from('employees')
        .select('id, sort_order')
        .order('sort_order', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      for (let index = 0; index < (remaining || []).length; index++) {
        const expectedSortOrder = index + 1;
        const currentSortOrder = remaining[index].sort_order;

        if (currentSortOrder !== expectedSortOrder) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({ sort_order: expectedSortOrder })
            .eq('id', remaining[index].id);

          if (updateError) throw new Error(updateError.message);
        }
      }
    }

    triggerInvalidate();
    return { success: true };
};

// ============================================
// LOCAL IMPLEMENTATIONS
// ============================================

// Migration Logic
const migrateFromLocalStorage = async () => {
  if (localStorage.getItem(STORAGE_KEYS.MIGRATION_DONE)) return;

  await logSQL('-- STARTING MIGRATION TO SQLITE --');
  
  try {
    // 0. Migrate Logs
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    for (const log of logs) {
      await window.electron.db.execute(
        'INSERT OR IGNORE INTO logs (id, timestamp, query) VALUES (?, ?, ?)',
        [log.id, log.timestamp, log.query]
      );
    }
    const customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
    for (const c of customers) {
      await window.electron.db.execute(
        'INSERT OR IGNORE INTO customers (id, name, phone) VALUES (?, ?, ?)',
        [c.id, c.name, c.phone]
      );
    }

    // 2. Migrate Publishers
    const publishers = JSON.parse(localStorage.getItem(STORAGE_KEYS.PUBLISHERS) || '[]');
    for (const p of publishers) {
      await window.electron.db.execute('INSERT OR IGNORE INTO publishers (id, name) VALUES (?, ?)', [p.id, p.name]);
    }

    // 3. Migrate Years
    const years = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS) || '[]');
    for (const y of years) {
      await window.electron.db.execute('INSERT OR IGNORE INTO academic_years (id, name) VALUES (?, ?)', [y.id, y.name]);
    }

    // 4. Migrate Subjects
    const subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || '[]');
    for (const s of subjects) {
      await window.electron.db.execute('INSERT OR IGNORE INTO subjects (id, name) VALUES (?, ?)', [s.id, s.name]);
    }

    // 5. Migrate Payment Methods
    const methods = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS) || '[]');
    for (const m of methods) {
      await window.electron.db.execute('INSERT OR IGNORE INTO payment_methods (id, name, type) VALUES (?, ?, ?)', [m.id, m.name, m.type]);
    }

    // 6. Migrate Employees
    const employees = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
    for (const [index, e] of employees.entries()) {
      await window.electron.db.execute(
        'INSERT OR IGNORE INTO employees (id, name, sort_order) VALUES (?, ?, ?)',
        [e.id, e.name, index + 1]
      );
    }

    // 7. Migrate Settings
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settings) {
      await window.electron.db.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['app_settings', settings]);
    }

    // 8. Migrate Orders
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    for (const o of orders) {
      await window.electron.db.execute(
        `INSERT OR IGNORE INTO orders (
          id, customer_id, publisher_id, year_id, subject, quantity, deposit, 
          payment_method_id, status, received_date, expected_delivery_date, 
          created_at, employee_name, book_type, notes, items
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          o.id, o.customerId, o.publisherId, o.academicYearId, o.subject, o.quantity, o.deposit,
          o.paymentMethodId, o.status, o.received_date || o.receivedDate, o.expected_delivery_date || o.expectedDeliveryDate,
          o.createdAt, o.employeeName, o.bookType, o.notes, JSON.stringify(o.items || [])
        ]
      );
    }

    localStorage.setItem(STORAGE_KEYS.MIGRATION_DONE, 'true');
    logSQL('-- MIGRATION COMPLETED SUCCESSFULLY --');
  } catch (err) {
    captureError(err, { source: 'storage', action: 'migrateFromLocalStorage' });
    logSQL('-- MIGRATION FAILED: ' + (err as Error).message);
  }
};

// Initialization
export const initDB = async () => {
    // Always init local DB as backup/cache capability, regardless of cloud mode
  logSQL(`-- Initializing SQLite Database...`);
  
  // Run migration first if needed
  await migrateFromLocalStorage();

  // Seed default data if SQLite is empty (for new installations)
  const publishersCount = await window.electron.db.getOne('SELECT COUNT(*) as count FROM publishers');
  if (publishersCount.count === 0) {
    const defaultPublishers = [
      { id: '1', name: 'سلاح التلميذ' },
      { id: '2', name: 'المعاصر' },
      { id: '3', name: 'الأضواء' },
      { id: '4', name: 'الامتحان' }
    ];
    for (const p of defaultPublishers) {
      await window.electron.db.execute('INSERT INTO publishers (id, name) VALUES (?, ?)', [p.id, p.name]);
    }
  }

  const yearsCount = await window.electron.db.getOne('SELECT COUNT(*) as count FROM academic_years');
  if (yearsCount.count === 0) {
    const defaultYears = [
      { id: '1', name: 'الصف الأول الابتدائي' },
      { id: '2', name: 'الصف الثاني الابتدائي' },
      { id: '3', name: 'الصف الثالث الابتدائي' },
      { id: '4', name: 'الصف الرابع الابتدائي' },
      { id: '5', name: 'الصف الخامس الابتدائي' },
      { id: '6', name: 'الصف السادس الابتدائي' },
      { id: '7', name: 'الصف الأول الإعدادي' },
      { id: '8', name: 'الصف الثاني الإعدادي' },
      { id: '9', name: 'الصف الثالث الإعدادي' }
    ];
    for (const y of defaultYears) {
      await window.electron.db.execute('INSERT INTO academic_years (id, name) VALUES (?, ?)', [y.id, y.name]);
    }
  }

  const subjectsCount = await window.electron.db.getOne('SELECT COUNT(*) as count FROM subjects');
  if (subjectsCount.count === 0) {
    const defaultSubjects = [
      { id: '1', name: 'لغة عربية' },
      { id: '2', name: 'لغة إنجليزية' },
      { id: '3', name: 'رياضيات' },
      { id: '4', name: 'علوم' },
      { id: '5', name: 'دراسات اجتماعية' },
      { id: '6', name: 'حاسب آلي' },
      { id: '7', name: 'تربية دينية' },
      { id: '8', name: 'أخرى' }
    ];
    for (const s of defaultSubjects) {
      await window.electron.db.execute('INSERT INTO subjects (id, name) VALUES (?, ?)', [s.id, s.name]);
    }
  }

  const methodsCount = await window.electron.db.getOne('SELECT COUNT(*) as count FROM payment_methods');
  if (methodsCount.count === 0) {
    const defaultMethods = [
      { id: '1', name: 'فودافون كاش', type: 'cash' },
      { id: '2', name: 'انستا باي', type: 'instapay' },
      { id: '3', name: 'فيزا / ماستركارد', type: 'card' },
      { id: '4', name: 'نقدي', type: 'cash' }
    ];
    for (const m of defaultMethods) {
      await window.electron.db.execute('INSERT INTO payment_methods (id, name, type) VALUES (?, ?, ?)', [m.id, m.name, m.type]);
    }
  }

  const bookTypesCount = await window.electron.db.getOne('SELECT COUNT(*) as count FROM book_types');
  if (bookTypesCount.count === 0) {
    await window.electron.db.execute('INSERT OR IGNORE INTO book_types (id, name) VALUES (?, ?), (?, ?)', ['1', 'عربي', '2', 'لغات']);
  }
};

export const getSQLLogs = async (): Promise<any[]> => {
  try {
    return await window.electron.db.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50');
  } catch (err) {
    captureWarning('Failed to get SQL logs', { source: 'storage', action: 'getSQLLogs', metadata: { error: String(err) } });
    return [];
  }
};

// Settings and Drafts can remain local-only for now, or cloud-synced if table exists. 
// For now, let's keep them local or if cloud table exists use it.
// Assuming 'settings' table exists in cloud too from my schema.
// Schema has 'settings' table: key text primary key, value text.

export const getAppSettings = async (): Promise<any> => {
  try {
    let res;
    if (USE_CLOUD) {
        const { data } = await supabase.from('settings').select('value').eq('key', 'app_settings').single();
        res = data;
    } else {
        res = await window.electron.db.getOne('SELECT value FROM settings WHERE key = ?', ['app_settings']);
    }
    return normalizeAppSettings(res ? JSON.parse(res.value) : null);
  } catch (error) {
    captureWarning('Error fetching settings', { source: 'storage', action: 'getAppSettings', metadata: { error: String(error) } });
    return normalizeAppSettings(null);
  }
};

export const saveAppSettings = async (settings: any): Promise<void> => {
  const normalizedSettings = normalizeAppSettings(settings);
  const employeeCount = await getEmployeeCount();

  if (normalizedSettings.employeeCapacity < employeeCount) {
    throw new Error(
      `لا يمكن تقليل سعة الموظفين إلى ${normalizedSettings.employeeCapacity} لأن عدد الموظفين الحالي ${employeeCount}. احذف موظفين أولاً.`
    );
  }

  const settingsStr = JSON.stringify(normalizedSettings);
  if (USE_CLOUD) {
      const { error } = await supabase.from('settings').upsert({ key: 'app_settings', value: settingsStr });
      if (error) throw new Error(error.message);
  } else {
    await logSQL(`UPDATE settings SET value = '${settingsStr}' WHERE key = 'app_settings'`);
    await window.electron.db.execute(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['app_settings', settingsStr]
    );
  }
  triggerInvalidate();
};

export const getDraft = async (key: string): Promise<any> => {
    // Drafts are better kept local for now, but strict cloud mode might want them synced.
    // Let's keep drafts local for performance/offline-safety unless specifically requested.
    // ... Actually, users switch devices, so cloud drafts are nice.
    // I'll adhere to USE_CLOUD for consistency.
  try {
    let res;
    if (USE_CLOUD) {
        const { data } = await supabase.from('settings').select('value').eq('key', `draft_${key}`).single();
        res = data;
    } else {
        res = await window.electron.db.getOne('SELECT value FROM settings WHERE key = ?', [`draft_${key}`]);
    }
    return res ? JSON.parse(res.value) : null;
  } catch (error) {
    captureWarning('Error fetching draft', { source: 'storage', action: 'getDraft', metadata: { key, error: String(error) } });
    return null;
  }
};

export const saveDraft = async (key: string, data: any): Promise<void> => {
  try {
    const dataStr = JSON.stringify(data);
    if (USE_CLOUD) {
        await supabase.from('settings').upsert({ key: `draft_${key}`, value: dataStr });
    } else {
        await window.electron.db.execute(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [`draft_${key}`, dataStr]
        );
    }
  } catch (error) {
    captureWarning('Error saving draft', { source: 'storage', action: 'saveDraft', metadata: { key, error: String(error) } });
  }
};

export const clearDraft = async (key: string): Promise<void> => {
  try {
    if (USE_CLOUD) {
        await supabase.from('settings').delete().eq('key', `draft_${key}`);
    } else {
        await window.electron.db.execute('DELETE FROM settings WHERE key = ?', [`draft_${key}`]);
    }
  } catch (error) {
    captureWarning('Error clearing draft', { source: 'storage', action: 'clearDraft', metadata: { key, error: String(error) } });
  }
};

// Generic helper to get reference tables
const localGetReferenceTable = async <T>(key: string): Promise<T[]> => {
  let tableName = '';
  switch (key) {
    case STORAGE_KEYS.CUSTOMERS: tableName = 'customers'; break;
    case STORAGE_KEYS.ORDERS: tableName = 'orders'; break;
    case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
    case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
    case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
    case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
    case STORAGE_KEYS.BOOK_TYPES: tableName = 'book_types'; break;
    case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
    default:
      captureWarning('Unknown reference key', { source: 'storage', action: 'localGetReferenceTable', metadata: { key } });
      return [];
  }
  
  try {
    if (key === STORAGE_KEYS.EMPLOYEES) {
      const rows = await window.electron.db.query(`
        SELECT *
        FROM employees
        ORDER BY CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END, sort_order ASC, id ASC
      `);
      return rows.map((row, index) => mapEmployeeRecord(row, index)) as T[];
    }

    return await window.electron.db.query(`SELECT * FROM ${tableName}`);
  } catch (error) {
    captureWarning('Error fetching local reference table', { source: 'storage', action: 'localGetReferenceTable', metadata: { tableName, error: String(error) } });
    return [];
  }
};

const localAddReferenceItem = async (key: string, name: string, extra?: any): Promise<any> => {
  let tableName = '';
  let sql = '';
  let params: any[] = [];

  switch (key) {
    case STORAGE_KEYS.PUBLISHERS:
      tableName = 'publishers';
      sql = 'INSERT INTO publishers (id, name) VALUES (?, ?)';
      params = [crypto.randomUUID(), name];
      break;
    case STORAGE_KEYS.ACADEMIC_YEARS:
      tableName = 'academic_years';
      sql = 'INSERT INTO academic_years (id, name) VALUES (?, ?)';
      params = [crypto.randomUUID(), name];
      break;
    case STORAGE_KEYS.SUBJECTS:
      tableName = 'subjects';
      sql = 'INSERT INTO subjects (id, name) VALUES (?, ?)';
      params = [crypto.randomUUID(), name];
      break;
    case STORAGE_KEYS.PAYMENT_METHODS:
      tableName = 'payment_methods';
      sql = 'INSERT INTO payment_methods (id, name, type) VALUES (?, ?, ?)';
      params = [crypto.randomUUID(), name, extra?.type || 'cash'];
      break;
    case STORAGE_KEYS.BOOK_TYPES:
      tableName = 'book_types';
      sql = 'INSERT INTO book_types (id, name) VALUES (?, ?)';
      params = [crypto.randomUUID(), name];
      break;
    case STORAGE_KEYS.EMPLOYEES: {
      tableName = 'employees';
      const employeeStats = await window.electron.db.getOne(
        'SELECT COUNT(*) as count, COALESCE(MAX(sort_order), 0) as maxSortOrder FROM employees'
      );
      const capacitySettings = normalizeAppSettings(await getAppSettings());

      if ((employeeStats?.count || 0) >= capacitySettings.employeeCapacity) {
        throw new Error(
          `لا يمكن إضافة موظف جديد لأن السعة القصوى للموظفين وصلت إلى ${capacitySettings.employeeCapacity}.`
        );
      }

      sql = 'INSERT INTO employees (id, name, sort_order) VALUES (?, ?, ?)';
      params = [crypto.randomUUID(), name, (employeeStats?.maxSortOrder || 0) + 1];
      break;
    }
    default: throw new Error(`Unknown reference key: ${key}`);
  }

  logSQL(sql.replace(/\?/g, (m, i) => `'${params[i]}'`));
  const result = await window.electron.db.execute(sql, params);
  triggerInvalidate();
  return result;
};

const localUpdateReferenceItem = async (key: string, id: string, name: string, extra?: any): Promise<any> => {
  let tableName = '';
  let sql = '';
  let params: any[] = [];

  switch (key) {
    case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
    case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
    case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
    case STORAGE_KEYS.PAYMENT_METHODS:
      tableName = 'payment_methods';
      sql = 'UPDATE payment_methods SET name = ?, type = ? WHERE id = ?';
      params = [name, extra?.type || 'cash', id];
      break;
    case STORAGE_KEYS.BOOK_TYPES: tableName = 'book_types'; break;
    case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
    default: throw new Error(`Unknown reference key: ${key}`);
  }

  if (!sql) {
    sql = `UPDATE ${tableName} SET name = ? WHERE id = ?`;
    params = [name, id];
  }

  logSQL(sql.replace(/\?/g, (m, i) => `'${params[i]}'`));
  const result = await window.electron.db.execute(sql, params);
  triggerInvalidate();
  return result;
};

const localDeleteReferenceItem = async (key: string, id: string): Promise<any> => {
  let tableName = '';
  switch (key) {
    case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
    case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
    case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
    case STORAGE_KEYS.PAYMENT_METHODS: tableName = 'payment_methods'; break;
    case STORAGE_KEYS.BOOK_TYPES: tableName = 'book_types'; break;
    case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
    default: throw new Error(`Unknown reference key: ${key}`);
  }

  if (key === STORAGE_KEYS.BOOK_TYPES) {
    const bt = await window.electron.db.getOne('SELECT name FROM book_types WHERE id = ?', [id]);
    const typeName = bt?.name || '';
    if (typeName) {
      const row = await window.electron.db.getOne('SELECT COUNT(*) as count FROM orders WHERE book_type = ?', [typeName]);
      if (row?.count > 0) {
        throw new Error(`لا يمكن حذف نوع الكتاب "${typeName}" لأنه مستخدم في ${row.count} طلب/طلبات.`);
      }
    }
  }

  const sql = `DELETE FROM ${tableName} WHERE id = ?`;
  logSQL(`DELETE FROM ${tableName} WHERE id = '${id}'`);
  const result = await window.electron.db.execute(sql, [id]);

  if (key === STORAGE_KEYS.EMPLOYEES) {
    const remainingEmployees = await window.electron.db.query(`
      SELECT id
      FROM employees
      ORDER BY CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END, sort_order ASC, id ASC
    `);

    for (let index = 0; index < remainingEmployees.length; index++) {
      await window.electron.db.execute(
        'UPDATE employees SET sort_order = ? WHERE id = ?',
        [index + 1, remainingEmployees[index].id]
      );
    }
  }

  triggerInvalidate();
  return result;
};

// EXPORT SWITCHER
export const getReferenceTable = USE_CLOUD ? cloudGetReferenceTable : localGetReferenceTable;
export const addReferenceItem = USE_CLOUD ? cloudAddReferenceItem : localAddReferenceItem;
export const updateReferenceItem = USE_CLOUD ? cloudUpdateReferenceItem : localUpdateReferenceItem;
export const deleteReferenceItem = USE_CLOUD ? cloudDeleteReferenceItem : localDeleteReferenceItem;
