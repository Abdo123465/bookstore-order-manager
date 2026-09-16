// Storage Adapter for Supabase (replaces Electron SQLite)
import { supabase } from './supabase.service';
import {
  Customer,
  Order,
  Publisher,
  AcademicYear,
  Subject,
  PaymentMethod,
  Employee,
  AppSettings,
} from '../types';

const DEFAULT_APP_SETTINGS: AppSettings = {
  deliveryIntervalDays: 7,
  minQuantity: 1,
  maxQuantity: 10,
  depositPerBook: 100,
  employeeCapacity: 10,
};

const normalizeAppSettings = (settings?: Partial<AppSettings> | null): AppSettings => {
  const employeeCapacity = Number(settings?.employeeCapacity);

  return {
    ...DEFAULT_APP_SETTINGS,
    ...(settings || {}),
    employeeCapacity: Number.isFinite(employeeCapacity)
      ? employeeCapacity
      : DEFAULT_APP_SETTINGS.employeeCapacity,
  };
};

const mapEmployeeRecord = (row: any, fallbackOrder?: number) => ({
  ...(row || {}),
  sortOrder: row?.sort_order ?? row?.sortOrder ?? fallbackOrder ?? 0,
});

const getEmployeeCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count || 0;
};

export const STORAGE_KEYS = {
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  PUBLISHERS: 'publishers',
  ACADEMIC_YEARS: 'academic_years',
  SUBJECTS: 'subjects',
  PAYMENT_METHODS: 'payment_methods',
  BOOK_TYPES: 'book_types',
  EMPLOYEES: 'employees',
  SETTINGS: 'settings',
};

// Initialize DB (no migration needed for cloud)
export const initDB = async () => {
  console.log('✅ Using Supabase Cloud Database');
  // Test connection
  const { error } = await supabase.from('publishers').select('count');
  if (error) {
    console.error('❌ Supabase connection failed:', error);
    throw new Error('Failed to connect to Supabase');
  }
};

// App Settings
export const getAppSettings = async (): Promise<AppSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'app_settings')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return normalizeAppSettings(data?.value ? JSON.parse(data.value) : null);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return normalizeAppSettings(null);
  }
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  const normalizedSettings = normalizeAppSettings(settings);
  const employeeCount = await getEmployeeCount();

  if (normalizedSettings.employeeCapacity < employeeCount) {
    throw new Error(
      `لا يمكن تقليل سعة الموظفين إلى ${normalizedSettings.employeeCapacity} لأن عدد الموظفين الحالي ${employeeCount}. احذف موظفين أولاً.`
    );
  }

  const settingsStr = JSON.stringify(normalizedSettings);
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'app_settings', value: settingsStr });
  
  if (error) throw error;
};

// Drafts
export const getDraft = async (key: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `draft_${key}`)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data?.value ? JSON.parse(data.value) : null;
  } catch (error) {
    console.error('Error fetching draft:', error);
    return null;
  }
};

export const saveDraft = async (key: string, data: any): Promise<void> => {
  try {
    const dataStr = JSON.stringify(data);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: `draft_${key}`, value: dataStr });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error saving draft:', error);
  }
};

export const clearDraft = async (key: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('key', `draft_${key}`);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
};

// Generic Reference Tables
export const getReferenceTable = async <T>(key: string): Promise<T[]> => {
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
    default: return [];
  }
  
  try {
    let query = supabase.from(tableName).select('*');
    if (key === STORAGE_KEYS.EMPLOYEES) {
      query = query.order('sort_order', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;

    if (key === STORAGE_KEYS.EMPLOYEES) {
      return (data || []).map((row, index) => mapEmployeeRecord(row, index)) as T[];
    }

    return (data || []) as T[];
  } catch (error) {
    console.error(`Error fetching table ${tableName}:`, error);
    return [];
  }
};

export const addReferenceItem = async (key: string, name: string, extra?: any): Promise<any> => {
  let tableName = '';
  let insertData: any = {};

  switch (key) {
    case STORAGE_KEYS.PUBLISHERS:
      tableName = 'publishers';
      insertData = { name };
      break;
    case STORAGE_KEYS.ACADEMIC_YEARS:
      tableName = 'academic_years';
      insertData = { name };
      break;
    case STORAGE_KEYS.SUBJECTS:
      tableName = 'subjects';
      insertData = { name };
      break;
    case STORAGE_KEYS.PAYMENT_METHODS:
      tableName = 'payment_methods';
      insertData = { name, type: extra?.type || 'cash' };
      break;
    case STORAGE_KEYS.BOOK_TYPES:
      tableName = 'book_types';
      insertData = { name };
      break;
    case STORAGE_KEYS.EMPLOYEES: {
      tableName = 'employees';
      const currentCount = await getEmployeeCount();
      const capacitySettings = normalizeAppSettings(await getAppSettings());

      if (currentCount >= capacitySettings.employeeCapacity) {
        throw new Error(
          `لا يمكن إضافة موظف جديد لأن السعة القصوى للموظفين وصلت إلى ${capacitySettings.employeeCapacity}.`
        );
      }

      const { data: maxRows, error: maxError } = await supabase
        .from('employees')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      if (maxError) throw maxError;

      insertData = {
        name,
        sort_order: (maxRows?.[0]?.sort_order || 0) + 1,
      };
      break;
    }
    default: throw new Error(`Unknown reference key: ${key}`);
  }

  const { data, error } = await supabase.from(tableName).insert(insertData).select();
  if (error) throw error;

  if (key === STORAGE_KEYS.EMPLOYEES) {
    return mapEmployeeRecord(data?.[0]);
  }

  return data?.[0];
};

export const updateReferenceItem = async (key: string, id: string, name: string, extra?: any): Promise<any> => {
  let tableName = '';
  let updateData: any = { name };

  switch (key) {
    case STORAGE_KEYS.PUBLISHERS: tableName = 'publishers'; break;
    case STORAGE_KEYS.ACADEMIC_YEARS: tableName = 'academic_years'; break;
    case STORAGE_KEYS.SUBJECTS: tableName = 'subjects'; break;
    case STORAGE_KEYS.PAYMENT_METHODS:
      tableName = 'payment_methods';
      updateData.type = extra?.type || 'cash';
      break;
    case STORAGE_KEYS.BOOK_TYPES: tableName = 'book_types'; break;
    case STORAGE_KEYS.EMPLOYEES: tableName = 'employees'; break;
    default: throw new Error(`Unknown reference key: ${key}`);
  }

  const { data, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', id)
    .select();
  
  if (error) throw error;

  if (key === STORAGE_KEYS.EMPLOYEES) {
    return mapEmployeeRecord(data?.[0]);
  }

  return data?.[0];
};

export const deleteReferenceItem = async (key: string, id: string): Promise<any> => {
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
    const { data: bt, error: btError } = await supabase.from('book_types').select('name').eq('id', id).single();
    if (btError) throw new Error(btError.message);
    const typeName = bt?.name || '';
    if (typeName) {
      const { count, error: checkError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('book_type', typeName);
      if (checkError) throw new Error(checkError.message);
      if (count && count > 0) {
        throw new Error(`لا يمكن حذف نوع الكتاب "${typeName}" لأنه مستخدم في ${count} طلب/طلبات.`);
      }
    }
  }

  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;

  if (key === STORAGE_KEYS.EMPLOYEES) {
    const { data: remaining, error: fetchError } = await supabase
      .from('employees')
      .select('id, sort_order')
      .order('sort_order', { ascending: true });

    if (fetchError) throw fetchError;

    for (let index = 0; index < (remaining || []).length; index++) {
      const expectedSortOrder = index + 1;
      if (remaining[index].sort_order !== expectedSortOrder) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ sort_order: expectedSortOrder })
          .eq('id', remaining[index].id);

        if (updateError) throw updateError;
      }
    }
  }

  return { success: true };

};

// No SQL logs for cloud version
export const getSQLLogs = async (): Promise<any[]> => {
  return [];
};

export const logSQL = async (query: string) => {
  // No-op for cloud version
  console.log('[SQL]', query);
};
