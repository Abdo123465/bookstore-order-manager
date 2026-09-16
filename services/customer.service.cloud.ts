import { Customer } from '../types';
import { supabase } from './supabase.service';

export const getAllCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const addCustomer = async (name: string, phone: string): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, phone })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateCustomer = async (id: number, name: string, phone: string): Promise<void> => {
  const { error } = await supabase
    .from('customers')
    .update({ name, phone })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteCustomer = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};
