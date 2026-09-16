import { Customer } from '../types';
import { USE_CLOUD } from './config';
import { supabase } from './supabase.service';
import { logSQL } from './storage';

// Cloud implementations
const cloudGetAllCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data || [];
};

const cloudAddCustomer = async (name: string, phone: string): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, phone })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
};

const cloudUpdateCustomer = async (id: number, name: string, phone: string): Promise<void> => {
  const { error } = await supabase
    .from('customers')
    .update({ name, phone })
    .eq('id', id);
  
  if (error) throw new Error(error.message);
};

const cloudDeleteCustomer = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  
  if (error) throw new Error(error.message);
};

// Local SQLite implementations
const localGetAllCustomers = async (): Promise<Customer[]> => {
  await logSQL(`SELECT * FROM customers;`);
  return await window.electron.db.query('SELECT * FROM customers ORDER BY name ASC');
};

const localAddCustomer = async (name: string, phone: string): Promise<Customer> => {
  await logSQL(`INSERT INTO customers (name, phone) VALUES ('${name}', '${phone}');`);
  
  const result = await window.electron.db.execute(
    'INSERT INTO customers (name, phone) VALUES (?, ?)',
    [name, phone]
  );
  
  return { id: result.lastInsertRowid, name, phone };
};

const localUpdateCustomer = async (id: number, name: string, phone: string): Promise<void> => {
  await logSQL(`UPDATE customers SET name = '${name}', phone = '${phone}' WHERE id = ${id};`);
  await window.electron.db.execute(
    'UPDATE customers SET name = ?, phone = ? WHERE id = ?',
    [name, phone, id]
  );
};

const localDeleteCustomer = async (id: number): Promise<void> => {
  await logSQL(`DELETE FROM customers WHERE id = ${id};`);
  await window.electron.db.execute('DELETE FROM customers WHERE id = ?', [id]);
};

// Export based on USE_CLOUD config
export const getAllCustomers = USE_CLOUD ? cloudGetAllCustomers : localGetAllCustomers;
export const addCustomer = USE_CLOUD ? cloudAddCustomer : localAddCustomer;
export const updateCustomer = USE_CLOUD ? cloudUpdateCustomer : localUpdateCustomer;
export const deleteCustomer = USE_CLOUD ? cloudDeleteCustomer : localDeleteCustomer;
